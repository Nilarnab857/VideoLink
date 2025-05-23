import {asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/User.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId)//use capital User for mongo db methods such as findbyid
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
       
        user.refreshToken = refreshToken//store refresh token in db
        await user.save({validateBeforeSave: false})//
    
        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating tokens")

    }
}

const registerUser = asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation - not empty (many types possible)
    //check if user already exists: using username and email
    //check for images , check for avatar
    //upload them to cloudinary, avatar check
    //create user object- create entry in db(.create)
    //remove password and refresh token field in response
    //check for user creation
    //if successfull creation return res
//
    const {fullname, email, username , password}= req.body
    console.log("email:", email)
//
    if(
        [fullname, email, username, password].some((field)=>
            field?.trim()===" ")
    ){
        throw new ApiError(400,"All fields are required");
    }
//
    const existingUser =await User.findOne({
        $or: [{username}, {email}]
    })
    if(existingUser){
        throw new ApiError(409,"User with Email or username already exists")
    }

    console.log("req.files:", req.files)
//
   const avatarLocalPath =  req.files?.avatar[0]?.path;
//    const coverImageLocalPath = req.files?.coverImage[0]?.path;


   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
    coverImageLocalPath = req.files.coverImage[0].path;
}

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required");

   }
 //
   const avatar= await uploadOnCloudinary(avatarLocalPath)
   const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
      throw new ApiError(400,"Avatar file is required2");

}
//
    const user = await User.create({
        fullname,
        avatar:avatar.url,// avatar is there it is confirmed before
        coverImage:coverImage?.url||"",//coverImage may or may not be there
        email,
        password, 
        username:username.toLowerCase()
    })
//
    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )
//
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")

    }
//
    return res.status(201).json(
      new ApiResponse(200,createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler(async(req,res)=>{
    // req.body->data
    // username or email
    // find the user in db
    // check for password
    // access and refresh token
    // send cookie(secure)
    
    //
    const {username, email, password} = req.body
    console.log(email)
    //
    if(!username && !email){
        throw new ApiError(400,"Username or email is required")
    }
    //
    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404,"User not found")
    }
    // 
    const isPasswordValid = await user.isPasswordCorrect(password) 
    
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid password")
    }
    //
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    //
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)    
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken: undefined
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",  options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   
   
   
    const incomingRefreshToken = req.cookies.refreshToken||req.body.refreshToken
   
   
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
try {
       const decodedToken =  jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
           
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
    
        if( incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401,"Refresh token expired or used")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)    
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken,options)
        .json(
            new ApiResponse(200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Access token refreshed successfully"
            )
        )
} catch (error) {
    throw new ApiError(401,error?.message||"Invalid refresh token")
    
}
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const {oldPassword, newPassword, confirmPassword} = req.body
    
    if(newPassword!==confirmPassword){
        throw new ApiError(400,"New password and confirm password do not match")
    }

    const user  = User.findById(req.user?._id)

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
   
    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid password")
    }
  
    user.password = newPassword
  
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200, 
    req.user,
    "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   
    const {fullname, email, username} = req.body
   
    if(!fullname||!email||!username){
        throw new ApiError(400,"All fields are required")
    }
   
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email:email,
                username:username.toLowerCase()
            }
        },
        {new:true}

    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "User details updated successfully")
    )
    

})

const updateUserAvatar  = asyncHandler(async(req,res)=>{

    const avatarLocalPath  = req.file?.avatar[0]?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar  =await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Avatar updated successfully")
    )


})

const updateUserCoverImage  = asyncHandler(async(req,res)=>{

    const coverImageLocalPath  = req.file?.coverImage[0]?.path
    
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image file is missing")
    }
    const coverImage  =await uploadOnCloudinary(coverImageLocalPath)
    
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "coverImage updated successfully")
    )


})

const getUserChannelProfile = asyncHandler( async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400, "Username is Missing");
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subcriptions",
                localField:"_id",
                foreignField:"channel",
                as :"subscribers"
            }
        },
        {   
             $lookup:{
                from:"subcriptions",
                localField:"_id",
                foreignField:"subscriber",
                as :"subscribedTo"
            },
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                subscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }

        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                subscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
    
            }    
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 , channel[0], "User channel fetched successfully")
    )



})

const getWatchHistory = asyncHandler(async(req,res)=>{
   
    const user = await User.aggregate([
        {
            $match:{
                _id:mongoose.Types.ObjectId(req.user._id)//important : see what req.user._id returns
            }

        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                
                pipeline:[//subpipeline
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                           
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ],

            }
            
        },
        {


        }
        ,{

        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully")
    )
})

export {

    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}