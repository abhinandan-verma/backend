
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { sendEmail } from "../utils/services/sendEmail.service.js";
import crypto from "crypto"

const generateAccessAndRefreshTokens = async(userId) => {
  try{
    // access token provide to use while refresh token store in DB
    // to make easy for user do not enter password again and again while session expire
   const user = await User.findById(userId) 
   const accessToken =  user.generateAccessToken()
   const refreshToken = user.generateRefreshToken()

   user.refreshToken = refreshToken
   user.save( {validateBeforeSave: false}) // while saving mandatory fields will be kicking, so to prevent it

   return { accessToken, refreshToken }

  }
  catch(error)
  {
    throw new ApiError(500, "Something went wrong while generating refresh and access tokens: ",error)
  }
}

// generate forgot password token

const generateForgotPasswordToken = async(email) => {
  const resetToken = crypto.randomBytes(20).toString("hex")
  console.log("resetToken: ".brightBlue, resetToken)

  const hashedToken = crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex")
  console.log("hashedToken: ".brightMagenta.bold, hashedToken)

  const user = await User.findOneAndUpdate(
    {email: email.toLowerCase()},
    {
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: Date.now() + 10 * 60 * 1000
    },
    {
      new: true
    }

  )

  if(!user){
    throw new ApiError(404, "User does not exist")
  }

  return resetToken
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
    console.log("email: ".cyan, email)
    console.log("username: ".magenta, username)
    console.log("password: ", password)
    console.log("fullname: ".yellow, fullName)

    // 2: neccessary checks if null or empty
    if(
      [fullName, email, username, password].some((field) => 
      field?.trim() === ""
    )
    ){
        throw new ApiError(400, "All fields are required")
    }else if(!email.includes("@")){
        throw new ApiError(400, "Email is not correct, try again")
    }

   const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser){
      console.log(`DB ${existedUser.username} and postman: ${username}`);
        console.log("existedUser: ", existedUser)

        if(existedUser.username === username.toLowerCase){
          throw new ApiError(409, 
            "User with same username exists"
            )
        }
        else if(existedUser.email === email.toLowerCase){
          throw new ApiError(409,
             "User with same email exists"
             )
        }
        
    }
    console.log("Request files: ", req.files)

   const avatarLocalPath = req.files?.avatar[0]?.path

   let coverImagePath = "";
   if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
      ) {
    coverImagePath = req.files.coverImage[0].path
  }

   console.log("avatar: ", avatarLocalPath)
   console.log("coverImage: ", coverImagePath)
   
   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }
   if (!coverImagePath) {
    console.error("Cover image path is undefined or null.");
    // Handle the error or set a default value as needed.
    } 
   
   const avatar =  await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImagePath)

   
   if(!avatar){
    throw new ApiError(409, "Error while uploading avatar on cloudinary")
   }

   console.log("avatar: ", avatar)
   console.log("coverImage: ", coverImage)
  
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
    avatarPublicId: avatar?.public_id || "",
    coverImagePublicId: coverImage?.public_id || ""
   })

  const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "something went wrong while registering the user")
  }

  console.log("createdUser Success : ", createdUser)

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registerd Successfully")
  )

})

// login the current user
const loginUser = asyncHandler(async  (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // check password
  // access and refresh token
  // send cookies

  const {email, username, password } = req.body
  console.log("username: ", username)
  console.log("email: ", email)
  console.log("password: ", password)

  if(!username && !email){
    throw new ApiError(400, "username or email is required")
  }
  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if(!user){
    throw new ApiError(404, "User does not exist")
  }

  console.log("user: ", user)

 const isPasswordValid = await user.isPasswordCorrect(password)

 if(!isPasswordValid){
  throw new ApiError(401, "Password Incorrect!")
}

console.log("Password is correct: ", isPasswordValid)

const {accessToken, refreshToken} = 
    await generateAccessAndRefreshTokens(user._id)

    const loggedInUser 
    = await User
     .findById(user._id)
     .select("-password -refreshToken")

    // const loggedInUser = {
    //   _id: user._id,
    //   username: user.username,
    //   email: user.email,
    //   password: user.password,
    //   fullName: user.fullName,
    //   avatar: user.avatar,
    //   coverImage: user.coverImage,
    //   watchHistory: user.watchHistory
    // }

    const options = {
      httpOnly: true,
      secure: true
    }

    console.log("options: ", options) 
    console.log("loggedInUser: ", loggedInUser)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User Logged In successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {

  const user = await User.findById(req.user._id)

  if(!user){
    throw new ApiError(404, "User does not exist")
  }

  console.log("user: ", user)

 await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1
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

  console.log("options: ", options)

  console.log("logoutUser: ", req.user)

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  console.log("incomingRefreshToken: ", incomingRefreshToken)

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized Request")
  }
  try {
    const decodedToken 
        = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    console.log("decodedToken: ", decodedToken)

    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid refresh Token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      console.log("Refresh Token is expired or Used")
      throw new ApiError(401, "Refresh Token is expired or Used")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }

    console.log("options: ", options)
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    console.log("accessToken: ", accessToken)
    console.log("newRefreshToken: ", newRefreshToken)

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
  if (!(oldPassword || newPassword)) {
    throw new ApiError(401, "Old and New Password are required".red.bold);
  }

  try {
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  
    if(!isPasswordCorrect){
      throw new ApiError(400, "Invalid Old Password")
    }
  
    console.log("isPasswordCorrect: ".america.bgBlue, isPasswordCorrect)
    user.password = newPassword
    await user.save({validateBeforeSave: false})
  
    return res.status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"))
  
  } catch (error) {
    throw new ApiError(
      401,
      "Error while updating password: ", error?.message
    )
  }
})

//  get currentuser endpoint
const getCurrentUser = asyncHandler(async(req, res) => {
  const user = req?.user
  if(!user){
      throw new ApiError(401, "User does not exist or logged in ")
  }
  else
  {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully".green.bold ))
  }
})

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req. body
  const userId = req.user?._id

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required")
  }
  if(!userId){
    throw new ApiError(404, "user not found")
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
 const userId = req.user?._id

 console.log("avatarLocalPath: ", avatarLocalPath)
 console.log("userid: ", userId)

 if(!avatarLocalPath){
  throw new ApiError(400, "Avatar File is missing")
 }
 if(!userId){
  throw new ApiError(401, "invalid reqiest for avatar")
 }

 const {deletePreviousImage} = await deleteFromCloudinary(
  [
    user.avatarPublicId
  ]
)

if(!deletePreviousImage){
  throw new ApiError(500, "Error while deleting avatar from cloudinary")
}

 const avatar = await uploadOnCloudinary(avatarLocalPath)
 if(!avatar.url){
    throw new ApiError(400, "Error while uploading avatar")
 }

 const user = await User.findByIdAndUpdate(
  userId,
  {
    $set: {
      avatar: avatar.url
    }
  },
  {new: true}
 ).select("-password")


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

 const {deletePreviousImage} = await deleteFromCloudinary(
  [
    user.coverImagePublicId
  ]
)
if(!deletePreviousImage){
  throw new ApiError(500, "Error while deleting coverImage from cloudinary")
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

    console.log("username: ", username)

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

// get watch history
const getWatchHistory = asyncHandler(async(req, res) => {

  const user1 = await User.findById(req.user._id)

    if(!user1){
      throw new ApiError(404, "User does not exist")
    }

    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup: {
          from: "vidoes",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner", 
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner"
                }
              }
            }
          ]
        }
      }
    ])

    if(!user?.length){
      throw new ApiError(404, "Watch history does not exist")
    }

    console.log("warch History user: ", user)

    return res.status(200)
    .json(
      new ApiResponse(
        200,
         user[0].watchHistory,
         "Watch history fetched successfully" )
    )
})

// forgot password user

const forgotPassword = asyncHandler(async(req, res) => {
  const {email} = req.body
  if(!email){
    throw new ApiError(400, "Email is required")
  }

  const user = await User.findOne({email: email.toLowerCase()})

  if(!user){
    throw new ApiError(404, "User does not exist")
  }

  console.log("user: ", user)

  const resetToken = await generateForgotPasswordToken(email)

  console.log("resetToken: ", resetToken)

  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/resetpassword/${resetToken}`

  console.log("resetUrl: ", resetUrl)

  const message = `You are receiving this email because you ${email} has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`

  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset token",
      text: message
    })

    return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password reset token sent to email")
    )
  } catch (error) {
    user.passwordResetToken = undefined
    user.passwordResetTokenExpiry = undefined
    await user.save({validateBeforeSave: false})
    throw new ApiError(500, "Error while sending email")
  }
})


// reset the password
const resetPassword = asyncHandler(async(req, res) => {
  const {resetToken} = req.params
  const {password} = req.body

  if(!resetToken){
    throw new ApiError(400, "Invalid reset token")
  }

  // hashing the reset token using sha256 as we have hashed the token in the database using sha256  
  const hashedToken = crypto
  .createHash("sha256")
  .update(resetToken).
  digest("hex")

  console.log("hashedToken: ", hashedToken)

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpiry: {$gt: Date.now()}
  })

  console.log("user: ", user)

  if(!user){
    throw new ApiError(400, "Invalid or expired reset token")
  }

  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetTokenExpiry = undefined
  
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(
    new ApiResponse(200, {}, "Password reset successfully")
  )
}
)

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
        getWatchHistory,
        forgotPassword,
        resetPassword
      }