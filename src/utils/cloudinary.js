import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import { asyncHandler } from "./asyncHandler.js";


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfully
        console.log("File is uploaded on cloudinary: ", response.url)
        fs.unlinkSync(localFilePath)
        return response
    }catch(err){
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the uploadoperation got failed
        console.log("error: ", err)
        return null
    }
}

const deleteFromCloudinary = async(publicIds) => {
    try {
        // delete image files
        const deleteImageFile = await cloudinary.api.delete_resources(
            publicIds, 
            {
                type: "upload",
                resource_type: "image"
            })

        // delete Video files
        const deleteVideoFile = await cloudinary.api.delete_resources(
            publicIds,
            {
                type: "upload",
                resource_type: "video"
            }
        )
        return { deleteImageFile, deleteVideoFile }

    } catch (error) {
        console.log("Error deleting image from cloudinary: ".red.bold, error?.message)
        return null
    }
}

const deleteImageFromCloudinary = async(publicIds) => {
    try {
        // delete image files
        const deleteImageFile = await cloudinary.api.delete_resources(
            publicIds, 
            {
                type: "upload",
                resource_type: "image"
            })
        return deleteImageFile
    } catch (error) {
        console.log("Error deleting image from cloudinary: ".red.bold, error?.message)
        return null
    }
}

export
    { 
        uploadOnCloudinary, 
        deleteFromCloudinary,
        deleteImageFromCloudinary
    }