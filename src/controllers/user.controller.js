
import {asyncHandler} from "../utlis/asyncHandler.js"
import {ApiError} from "../utlis/ApiError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import { ApiResponse } from "../utlis/ApiResponse.js";
import jwt from "jsonwebtoken"
import { raw } from "express";

const generateAccessAndRefreshTokens = async(userId) => {
  try{
   const user = await User.findById(userId) 
   const accessToken =  user.generateAccessToken()
   const refreshToken = user.generateRefreshToken()

   user.refreshToken = refreshToken
   user.save( {validateBeforeSave: false})

   return { accessToken, refreshToken }

  }
  catch(error)
  {
    throw new ApiError(500, "Something went wrong while generating refresh and access tokens: ",error)
  }
}
const registerUser = asyncHandler( async (req, res) => {
    // get user details from the front-end
    // validation - not empty
    // chech if user already exists: username email
    // check for images & avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email,username, password } = req.body
    console.log("email: ", email)
    console.log("username: ", username)
    console.log("password: ", password)
    console.log("fullname: ", fullName)

    if(
      [fullName, email, username, password].some((field) => 
      field?.trim() === ""
    )
    ){
        throw new ApiError(400, "All fields are required")
    }
   const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })
    if(existedUser){
        console.log("existedUser: ", existedUser)
        throw new ApiError(409, "User with same email or username exists")
    }
    console.log("Request files: ", req.files)

    

   const avatarLocalPath = req.files?.avatar[0]?.path

   let coverImagePath = "";
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImagePath = req.files.coverImage[0].path
  }

if (!coverImagePath) {
    console.error("Cover image path is undefined or null.");
    // Handle the error or set a default value as needed.
} 
   console.log("avatar: ", avatarLocalPath)
   console.log("coverImage: ", coverImagePath)
   
  //  let coverImageLocal;
  //   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
  //       coverImageLocal = req.files.coverImage[0].path
  //   }

   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }
   
   const avatar =  await uploadOnCloudinary(avatarLocalPath)
   let coverImage = await uploadOnCloudinary(coverImagePath)

   if(coverImage == null){
    coverImage = "default"
   }else{
    coverImage = coverImage.url
   }

   if(!avatar){
    throw new ApiError(409, "Avatar file is required")
   }
  
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage,
    email,
    password,
    username: username.toLowerCase()
   })

  const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registerd Successfully")
  )

})

const loginUser = asyncHandler(async  (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // check password
  // access and refresh token
  // send cookies

  const {email, username, password } = req.body
  console.log("email: ", email)

  if(!username && !email){
    throw new ApiError(400, "username or email is required")
  }
  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if(!user){
    throw new ApiError(404, "User does not exist")
  }

 const isPasswordValid = await user.isPasswordCorrect(password)

 if(!isPasswordValid){
  throw new ApiError(401, "Password Incorrect!")
}

const {accessToken, refreshToken} = 
    await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "User Logged In successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
 await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized Request")
  }
  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid refresh Token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token is expired or Used")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    return res.
    status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken, refreshToken: newRefreshToken
        },
        "Access Token refreshed successfully"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refreshToken")
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body

 const user = await User.findById(req.user?._id)
const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid Old Password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res.status(200)
  .json(new ApiResponse(200, {}, "password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "Current user fetched successfully" ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req. body

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required")
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    {new: true}

    ).select("-pasword")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => 
{
 const avatarLocalPath = await req.file?.path

 if(!avatarLocalPath){
  throw new ApiError(400, "Avatar File is missing")
 }

 const avatar = await uploadOnCloudinary(avatarLocalPath)
 if(!avatar.url){
    throw new ApiError(400, "Error while uploading avatar")
 }

 const user = await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set: {
      avatar: avatar.url
    }
  },
  {new: true}
 ).select("-password")
 // todo -> delete the old avatar and coverImage from cloudinary

 return res.status(200)
 .json(
  new ApiResponse(200, user, "Avatar Updated  Successfully")
 )
})

const updateUserCoverImage = asyncHandler(async(req, res) => 
{
 const coverImageLocalPath = await req.file?.path

 if(!coverImageLocalPath){
  throw new ApiError(400, "CoverImage File is missing")
 }

 const coverImage = await uploadOnCloudinary(coverImageLocalPath)
 if(!coverImage.url){
    throw new ApiError(400, "Error while uploading coverImage")
 }

 const user = await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set: {
     coverImage: coverImage.url
    }
  },
  {new: true}
 ).select("-password")

 return res.status(200)
 .json(
  new ApiResponse(200, user, "Cover Image Updated  Successfully")
 )
})

const getUserChannelProfile = asyncHandler(async( req, res) => {
    const {username} = req.params
    if(!username?.trim()){
      throw new ApiError(400, "username is missing")
    }

   const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup:{
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
   ])
   if(!channel?.length){
    throw new ApiError(404, "Channel does no exist")
   }

   console.log("channel: ",channel)

   return res
   .status(200)
   .json(
    new ApiResponse(200, channel[0], "User Channel fetched successfully")
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
        getUserChannelProfile
      }