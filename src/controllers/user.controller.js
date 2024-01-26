import { response } from "express"
import {asyncHandler} from "../utlis/asyncHandler.js"
import Color from "color";
import {ApiError} from "../utlis/ApiError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import { ApiResponse } from "../utlis/ApiResponse.js";

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

    const { fullname, email,username, password } = req.body
    console.log("email: ", email)
    console.log("username: ", username)
    console.log("password: ", password)

    if(
[fullname, email, username, password].some(() => 
field?.trim() === ""
)
    ){
        throw new ApiError(400, "All fields are required")
    }
   const existedUser =  User.findOne({
        $or: [{ username },{ email }]
    })
    if(existedUser){
        console.log("existedUser: ", existedUser)
        throw new ApiError(409, "User with same email or username exists")
    }

   const avatarLocalPath = req.files?.avatar[0]?.path
   const coverLocalImage = req.files?.coverImage[0].path

   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }

   const avatar =  await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverLocalImage)

   if(!avatar){
    throw new ApiError(400, "Avatar file is required")
   }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
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

export {registerUser}