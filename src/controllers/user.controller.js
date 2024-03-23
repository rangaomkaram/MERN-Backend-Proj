import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinaryService.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

       await user.save({validateBeforeSave : false})

       return { accessToken, refreshToken}

    } catch (error) {
        throw ApiError(500, "Something Went Wrong while generating accessToken and Refresh token")
        
    }

}

const registerUser = asyncHandler(async(req,res) =>{
    // get user details from frontend/ form(postman)
    // validation - not empty
    // check if user already exist (username || email)
    // check for images , check for avatar -> upload to cloudinary
    // check for cover if upload them to cloudinary 
    // create user object -> create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const { email , username , fullName , password } = req.body
    // console.log("username is : ", username,email,fullName,password)


    // check multiple fields using some
    if ([ fullName, email, username, password ].some((field) => field?.trim() === "" )) 
    {
        throw new ApiError(400, "All files are required")
    }
    
    //$ dollar operator is used for logic gate operations (or , nor , and etc)
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "username or User with email is already exists")
    }

    console.table(req.body, req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImgLocalPath = req.files?.coverImage[0]?.path;

    // if coverImage doesn't upload then above optinal chaining may not work, so go traditional
    let coverImgLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
        coverImgLocalPath = req.files.coverImage[0].path;
    }




    if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImgLocalPath);

   if(!avatar){
    throw new ApiError(400, "Avatar file / profile Image is required")
   }

   // object creation for DB entry

   const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email, 
    password,
    username: username.toLowerCase()
})

   // checking the user creating by using findById method
   // After creation , we remove password and refreshToken ,By using select method with "-attr1 -attr2" 
    const  userCreated =  await User.findById(user._id).select(
       "-password -refreshToken"
    )

    if(!userCreated){
        throw new ApiError(500, "Something went wrong while registering by the User")
    }

    return res.status(201).json(
        new ApiResponse(200, userCreated, "User Successfully Created !!!!")
    )

})

const loginUser = asyncHandler(async(res,req) => {
    // get data from -> req.body  
    // get the username or email
    // find username or email
    // Password check 
    // access and refresh token generate
    // sent token through secure cookies  

    const {email, username, password} = req.body;

    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({ $or :[{ username },{ email }]})

    if(!user){
        throw new ApiError(404, "user  is not registered or user doesn't exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw ApiError(401, "password is incorrect")
    }

    const { accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id) 
    
    const userLogged = await User.findById(user._id).select("-password -refreshToken");

    // for secure login 

    const options = {
        httpOnly : true,
        secure: true
    }

    // response (send cookie)

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: userLogged, accessToken, refreshToken
            },
            "user loggedIn Successfully !!"
        )
    )


    
    

})


// logout user

const userLogout = asyncHandler(async(req, res) => {
    // middleware (multer) 
    await User.findByIdAndUpdate(
        req.user._id,
        {
          $set : {
            refreshToken : undefined
          }   
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Suceessfully"))


})


export {
    registerUser,
    loginUser, 
    userLogout
}