import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"

const publishAVideo = asyncHandler(async(req, res) => {
    // get the local path of video and thumbnail from a form
    // check path empty or not
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
        const {
            page = 1,
            limit = 10,
            query,
            sortBy,
            sortType,
            userId
        } = req.query;
        
        // find the user by id
        const user = await  User.findById(userId).select('-password');
        if(!user){
            throw new ApiError(404, "User not found")
        }
        // find the videos based on the query
        const getAllVideosAggregate = await Video.aggregate([
        {
            $match: {
                videoOwner: mongoose.Types.ObjectId(userId),
                $or: [
                    {title: {$regex: query, $options: "i"}},
                    {description: {$regex: query, $options: "i"}}
                ]
            }
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
        ])

        Video.aggregatePaginate(getAllVideosAggregate, {page, limit})
        .then((result) => {
            return res.status(200).json(new ApiResponse(200, "Fetchd All videos successfully", result))
        })

    } catch (error) {
        console.log("Error while getting all videos: ", error?.message)
        throw new ApiError(500, "Error while getting all videos: ")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    // find the video by id
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }
    // send the video to the user
    res.status(200)
    .json(new ApiResponse(200, "Video found", video))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body
    const thumbnail = req.files?.path
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    if(
        !title ||
        !description ||
        (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0)
    ){
        throw new ApiError(400, "title, description and thumbnail are required")
    }
    // find the video by id
    const previousVideo = await Video.findOne(
        {
             _id: videoId 
        }
    )
    if(!previousVideo){
        throw new ApiError(404, "Video not found")
    }

    let updatedFields = {
        $set: {
            title,
            description
        }
    }
    let thumbnailCloudinaryUrl;
    if(thumbnail){
        // upload the new thumbnail to cloudinary
        thumbnailCloudinaryUrl = await uploadOnCloudinary(thumbnail)
        if(!thumbnailCloudinaryUrl){
            throw new ApiError(500, "Error while uploading thumbnail to cloudinary")
        }

        updatedFields.$set = {
            public_id: thumbnailCloudinaryUrl?.public_id,
            url: thumbnailCloudinaryUrl?.url
        }
        // remove the previous thumbnail from cloudinary
        await deleteFromCloudinary(previousVideo?.thumbnail?.public_id)

        // remove the previous thumbnail from the local server
        await fs.promises.unlink(previousVideo?.thumbnail?.path)
    }
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    // find the video by id
    const video = await Video.findOne(
        {
            _id: videoId
        }
    )
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    // remove the video from the database
    await Video.deleteOne(
        {
            _id: videoId
        }
    )
    // remove the video from cloudinary
    await deleteFromCloudinary(video?.public_id)
    // remove the video from the local server
    await fs.promises.unlink(video?.path)
    // remove the thumbnail from cloudinary
    await deleteFromCloudinary(video?.thumbnail?.public_id)
    // remove the thumbnail from the local server
    await fs.promises.unlink(video?.thumbnail?.path)
    // send the response to the user
    res.status(200).json(new ApiResponse(200, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    // find the video by id
    const video = await Video.findById(
        {
            _id: videoId
        }
    )
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video?.owner.toString() !== req?.user?._id.toString()){
        throw new ApiError(403, "You are not authorized to update the video")
    }
    // toggle the publish status of the video
    video.isPublic = !video.isPublic
    // save the updated video
    video.save({validateBeforeSave: false})
    // send the response to the user
    res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video publish status updated successfully"
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}