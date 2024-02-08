import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"

const uploadVideos = asyncHandler(async(req, res) => {
    // get the loval path of video and thumbnail from a form
    //check path empty or not
    // upload on cloudinary
    // grt both the url
    // store the url on database
    // remove both the files the local server
    // give the response to the user

    let videoLocalPath;
    let thumbnailLocalPath;
    try{
        const {title, description} = req.body

        if(
            req.files &&
            Array.isArray(req.files.videoFile) &&
            req.files.videoFile.length > 0
        ){
            videoLocalPath = req?.files.videoFile[0].path
        }
        if(
            req.files &&
            Array.isArray(req.files.thumbnail) &&
            req.files.thumbnail.length > 0
        ){
            thumbnailLocalPath = req?.files.thumbnail.path
        }
        if(!title || !description){
            throw new ApiError(400, "title and description is required")
        }
        if(!videoLocalPath || !thumbnailLocalPath){
            throw new ApiError(404, "thumbnail and video are mandatory to upload")
        }
        const videoCloudinaryUrl = await uploadOnCloudinary(videoLocalPath);
        const thumbnailCloudinaryUrl = await uploadOnCloudinary(thumbnailLocalPath);

        if(!videoCloudinaryUrl){
            throw new ApiError(500, "Error while uploading video to cloudinary")
        }
        if(!thumbnailCloudinaryUrl){
            throw new ApiError(500, "Error while uploading thumbnail to cloudinary")
        }
        // convert duration to a number, assuming it to be string or number
        const duration = 
        typeof videoCloudinaryUrl.duration === "string"
        ? parseFloat(videoCloudinaryUrl.duration)
        : videoCloudinaryUrl.duration;

        const videoPublicId = videoCloudinaryUrl?.public_id
    }catch(error){
        console.log("Error while uploading videos: ", error?.message)
        throw new ApiError(500, "Error while uploading videos: ", error?.message)
    }
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    // retreive all videos from the databases
    // apply the query based filtering if the query is present
    // Sort video based on sortBy and sortType
    // retrieve the appropriate page of videos based on the page number and the limit
    try {
        let aggregatePipeline = []

        // filter all the videos based on a case-sensitive regular expression match in the title field
        if(query){
            aggregatePipeline.push({
                $match: {
                    title: {
                        $regr
                    }
                }
            })
        }
        
    } catch (error) {
        console.log("Error while getting all videos: ", error?.message)
        throw new ApiError(500, "Error while getting all videos: ")
    }
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}