import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
   
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    //if it is a channel then it should be a user
    const channel = await User.findById({
        _id: channelId,
    })

    if(!channel){
        throw new ApiError(404, "Channel not found")
    }

    let subscribe;
    let unsubscribe;

    const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if(subscription){
        //if already subscribed then unsubscribe
        unsubscribe = await Subscription.findByIdAndDelete(
            {
               subscriber: req.user._id,
                channel: channelId
            }
        )

        if(!unsubscribe){
            throw new ApiError(500, "Failed to unsubscribe")
        }

        // return success response
        return new ApiResponse(
            res,
            200,
            "Successfully unsubscribed"
        )
    }else{
        //if not subscribed then subscribe
        subscribe = await Subscription.create({
            subscriber: req.user._id,
            channel: channelId
        })

        if(!subscribe){
            throw new ApiError(500, "Failed to subscribe")
        }

        // return success response
        return new ApiResponse(
            res,
            200,
            "Successfully subscribed"
        )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // get channel id from request params
    // verify if it is a valid object id
    // find the channel
    //find all the subscribers of the channel

    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId?.trim())
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers"
            }
        },
        {
            $project: {
              subscribers: {
                username: 1,
                fullName: 1,
                avatar: 1
              }
            }
        }
    ])

    // console.log(subscriptions)

    // return success response
    return new ApiResponse(
        res,
        200,
        "Subscribers list",
        subscriptions
    )

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // get the user id from request params
    // verify if it is a valid object id
    // find the user
    // find all the channels to which user has subscribed

    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid user id")
    }

    const subscriptions = await Subscription.aggregate([
        {
            // in this case i am a subscriber and i want to find all the channels to which i have subscribed
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId?.trim())
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channels"
            }
        },
        {
            $project: {
                channels: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        },

    ])

    console.log(subscriptions)
    
    // return success response
    return new ApiResponse(
        res,
        200,
        "Subscribed channels list",
        subscriptions
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}