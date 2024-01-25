import { response } from "express"
import {asyncHandler} from "../utlis/asyncHandler.js"
import Color from "color";

const registerUser = asyncHandler( async (req, res) => {
    res.status(200).json({
        message: "ok Abhinandan, Server is running"
       
    })
    console.log("Server is running")
})

export {registerUser}