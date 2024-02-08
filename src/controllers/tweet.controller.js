import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    // get the tweet from the request
    // check if the tweet is empty or not
    //save the tweet to the database
    // give the response to the user
    const {tweet} = req.body
    if(!tweet){
        throw new ApiError(400, "tweet is Null or Empty")
    }

    const newTweet = new Tweet({
        tweet,
        owner: req.user._id
    })

    await newTweet.save()

    res.status(201).json(new ApiResponse(201, "Tweet created successfully", newTweet))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // get the user id from the request
    // check if the user id is valid or not
    // get the tweets from the database
    // give the response to the user

    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId)
    if(!user){
        throw new ApiError(404, "User not found")
    }
    // manage and get all the tweets of the user
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: user._id,
            }
        },
    ])

    if(!tweets){
        throw new ApiError(404, "Tweets not found")
    }
    // return the response to the user
    res.status(200).json(new ApiResponse(200, "Tweets found successfully", tweets))
})

const updateTweet = asyncHandler(async (req, res) => {
    // get the tweet id from the request
    // check if the tweet id is valid or not
    // get the tweet from the database
    // check if the tweet is present or not
    // check if the tweet is owned by the user or not
    // update the tweet

    const {tweetId} = req.params
    const {newTweet} = req.body

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
           $set: {
               tweet: newTweet
           }
        },
        {
            new: true
        }
    )
    if(!updatedTweet){
    throw new ApiError(500, "Tweet not updated, Error occurred")
    }
    // return the response to the user
    res.status(200).json(new ApiResponse(200, "Tweet updated successfully", updatedTweet))
})      

const deleteTweet = asyncHandler(async (req, res) => {
    // get the tweet id from the request
    // verify the tweet id
    // get the tweet from the database
    // check if the tweet is present or not
    // check if the tweet is owned by the user or not
    // delete the tweet

    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(
        {
            _id: tweetId
        }
    )

    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    res.status(200).json(new ApiResponse(200, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}