import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    // check if the user has already liked the video
    const videoLike = await Like.findOne({video: videoId, user: req.user._id})

    let like;
    let unlike;
    if(videoLike){
        // if the user has already liked the video, then unlike it
        unlike = await Like.findByIdAndDelete(videoLike._id)

        if(!unlike){
            throw new ApiError(500, "Unable to unlike the video")
        }
    }
    else{
        // if the user has not liked the video, then like it
        like = await Like.create({video: videoId, likedBy: req.user._id})

        if(!like){
            throw new ApiError(500, "Unable to like the video")
        }
    }
    
    // send the response
    return new ApiResponse(200, {
        like: like,
        unlike: unlike
    }).send(res)

})

// like or unlike a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    // check if the user has already liked the comment
    const commentLike = await Like.findOne({comment: commentId, likedBy: req.user._id})

    let like;
    let unlike;

    if(commentLike){
        // if the user has already liked the comment, then unlike it
        unlike = await Like.findByIdAndDelete(commentLike._id)

        if(!unlike){
            throw new ApiError(500, "Unable to unlike the comment")
        }
    }
    else{
        // if the user has not liked the comment, then like it
        like = await Like.create({comment: commentId, likedBy: req.user._id})

        if(!like){
            throw new ApiError(500, "Unable to like the comment")
        }
    }

    // send the response
    return new ApiResponse(200, {
        like: like,
        unlike: unlike
    }).send(res)
})


// like or unlike a tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    // check if the user has already liked the tweet
    const tweet = await Like.findOne({tweet: tweetId, likedBy: req.user._id})

    let like;
    let unlike;

    if(tweet){
        // if the user has already liked the tweet, then unlike it
        unlike = await Like.findByIdAndDelete(tweet._id)

        if(!unlike){
            throw new ApiError(500, "Unable to unlike the tweet")
        }
    }
    else{
        // if the user has not liked the tweet, then like it
        like = await Like.create({tweet: tweetId, likedBy: req.user._id})

        if(!like){
            throw new ApiError(500, "Unable to like the tweet")
        }
    }

    // send the response
    return new ApiResponse(200, {
        like: like,
        unlike: unlike
    }).send(res)
}
)

// get likedVideos
const getLikedVideos = asyncHandler(async (req, res) => {
   
    const userId = req.params.userId || req.user._id

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }
    // find the user in database
    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(404, "User not found")
    }

    // find the videos liked by the user
    // populate the video field with the video details
    // select only the username field from the user details
    // and send the response

    const likes = await Like.aggregate([
    {
        $lookup: {
            from: "videos",
            localField: "video",
            foreignField: "_id",
            as: "video",
            pipeline: [
                {
                    $lookup: {
                    from: "users",
                    localField: "videoOwner",
                    foreignField: "_id",
                    as: "videoOwner",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                fullName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    videoOwner: {
                        $arrayElemAt: ["$videoOwner", 0]
                    }
                }
            }
        ]
        }
    }
    ])

    // send the response
    return res.status(200).json(
        new ApiResponse(
            200,
            likes[2].likedVideos,
            "Liked videos retrieved successfully"
        )
    )
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}