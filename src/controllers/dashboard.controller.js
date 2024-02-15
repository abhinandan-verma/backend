import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const {channelId} = req.params

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    // get the total subscribers
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $count: "subscribers"
        }
    ])

    // get the total videos uploaded
    const totalVideos = await Video.aggregate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $count: "Videos"
        }
    ])

    // get the total views
    const totalViews = await Video.aggregate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: {
                    $sum: "$views"
                }
            }
        }
    ])

    // get the total likes
    const totalLikes = await Like.aggregate([
        {
            $match: {
                channel: mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideoLikes: {
                    $sum: {
                        $cond: [
                            { $ifNull: ["$video", false] },
                            1, // if the video field is not null, add 1 to the total likes
                            0 // else add 0
                        ]
                    }
                },
                totalTweetLikes: {
                    $sum: {
                        $cond: [
                            { $ifNull: ["$tweet", false] },
                            1, // if the tweet field is not null, add 1 to the total likes
                            0 // else add 0
                        ]
                    }
                },
                totalCommentLikes: {
                    $sum: {
                        $cond: [
                            { $ifNull: ["$comment", false] },
                            1, // if the comment field is not null, add 1 to the total likes
                            0 // else add 0
                        ]
                    }
                }
            
            }
        }
    ])

})

const stats = {
    Subscribers: totalSubscribers[0].subcribers || 0,
    totalVideos: totalVideos[0]?.Videos || 0,
    totalViews: totalViews[0]?.totalViews || 0,
    totalLikes: totalLikes[0]?.totalLikes || 0,
    totalTweetLikes: totalLikes[0]?.totalTweetLikes || 0,
    totalCommentLikes: totalLikes[0]?.totalCommentLikes || 0
}

// return response

res.status(200).json(
    new ApiResponse(
        200, 
        "Channel stats", 
        stats
        )
    )


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const {channelId} = req.params

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    const allVideos = await Video.find({
        videoOwner: req.user._id
    })

    if(!allVideos){
        throw new ApiError(404, "No videos found")
    }

    res.status(200).json(
        new ApiResponse(
            200, 
            "All videos fetched successfully", 
            allVideos
            )
        )
})

export {
    getChannelStats, 
    getChannelVideos
    }