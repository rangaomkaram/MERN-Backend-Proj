import mongoose,{Schema} from "mongoose";
import  jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true
        },
        email : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true
        },
        fullName : {
            type: String,
            required : true,
            trim : true, 
            index : true
        },
        avatar: {
            type : String, // Cloudinary url or any assest management domain
            required : true,
        },
        coverImage: {
            type : String , // Cloudinary url
        },
        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ],
        password : {
            type : String,
            required : [true, "Password is required"]
        },
        refreshToken : {
            type : String
        }
    },{
        timestamps: true
    }
)

// beaware of call back , don't use arrow function , this context is reference not avail

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password,10)
    next()
})

// custom methods for User

userSchema.methods.isPasswordCorrect = async function (password){
  return await  bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        {
            _id: this._id,
            email : this.email,
            username : this.username,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECERT,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
        
    )
}
userSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }

    )
}

export const User = mongoose.model("User", userSchema)