
import {asyncHandler} from "../utlis/asyncHandler.js"
import {ApiError} from "../utlis/ApiError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import { ApiResponse } from "../utlis/ApiResponse.js";

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
export {registerUser,
        loginUser,
        logoutUser,
        }