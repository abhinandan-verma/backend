import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Tweet} from "../models/tweet.model.js"
import {Video} from "../models/video.model.js"

// get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    // find video in the database
    const video = new Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        }
    ])
    Comment.aggregatePaginate(commentAggregate, {
        page,
        limit
}).then((result) => {
    return new ApiResponse(
        200,
        "Successfully retrieved comments",
        result
    )
})
})

// get comment to a tweet

const getTweetComments = asyncHandler(async (req, res) => {
    // get the tweet id from the request parameters
    // check if the tweet id is valid
    // find the tweet in the database
    // if the tweet is not found, return an error
    // get the page and limit query parameters from the request
    // get all comments for the tweet
    // return the comments

    const { tweetId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    // find tweet in the database
    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        }
    ])

    Comment.aggregatePaginate(commentAggregate, {
        page,
        limit
    }).then((result) => {
        return new ApiResponse(
            200,
            "Successfully retrieved comments",
            result
        )
    })
    .catch((error) => {
        throw new ApiError(500, "Failed to retrieve comments", error)
    })
})

// add a comment to a video
const addCommentToVideo = asyncHandler(async (req, res) => {
    // get the video id from the request parameters
    // check if the video id is valid
    // find the video in the database
    // if the video is not found, return an error
    // create a new comment
    // return the new comment

    const {videoId} = req.params
    const {comment} = req.body

    console.log("req.body", req.body)
    console.log("comment", comment)

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    // find video in the database
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const newComment = await Comment.create({
        user: req.user._id,
        video: videoId,
        content: comment
    })

    if(!newComment){
        throw new ApiError(500, "Failed to add comment")
    }

    return new ApiResponse(
        res,
        201,
        "Successfully added comment",
        newComment
    )

})

// add a comment to a tweet
const updateCommentToVideo = asyncHandler(async (req, res) => {
    // get the comment id from the request parameters
    // check if the video id is valid
    // find the video in the database
    // if the video is not found, return an error
    // update the comment
    // return the updated comment

    const {commentId} = req.params
    const {newComment} = req.body

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content: newComment
        },
        {
            new: true
        }
    )

    if(!updateComment){
        throw new ApiError(504, "Something went wrong while updating comment")
    }
    
    return new ApiResponse(
        200,
        "Successfully updated comment",
        updateComment
    )
})

// delete a comment to a video
const deleteCommentToVideo = asyncHandler(async (req, res) => {
    // get the comment id from the request parameters
    // check if the comment id is valid
    // find the comment in the database
    // if the comment is not found, return an error
    // delete the comment
    // return the deleted comment

    const {commentId} = req.params

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if(!deletedComment){
        throw new ApiError(500, "Failed to delete comment")
    }

    return new ApiResponse(
        200,
        "Successfully deleted comment",
        deletedComment
    )
})

// add comment to tweet

const addCommentToTweet = asyncHandler(async (req, res) => {
    // get the tweet id from the request parameters
    // check if the tweet id is valid
    // find the tweet in the database
    // if the tweet is not found, return an error
    // create a new comment
    // return the new comment

    const {tweetId} = req.params
    const {comment} = req.body

    if(!mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    // find tweet in the database
    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    const newComment = await Comment.create({
        user: req.user._id,
        tweet: tweetId,
        content: comment
    })

    if(!newComment){
        throw new ApiError(500, "Failed to add comment")
    }

    return new ApiResponse(
        res,
        201,
        "Successfully added comment",
        newComment
    )
})

// update comment to tweet

const updateCommentToTweet = asyncHandler(async (req, res) => {
    // get the comment id from the request parameters
    // check if the tweet id is valid
    // find the tweet in the database
    // if the tweet is not found, return an error
    // update the comment
    // return the updated comment

    const {commentId} = req.params
    const {newComment} = req.body

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content: newComment
        },
        {
            new: true
        }
    )

    if(!updateComment){
        throw new ApiError(504, "Something went wrong while updating comment")
    }
    
    return new ApiResponse(
        200,
        "Successfully updated comment",
        updateComment
    )
})

// delete comment to tweet

const deleteCommentToTweet = asyncHandler(async (req, res) => {
    // get the comment id from the request parameters
    // check if the comment id is valid
    // find the comment in the database
    // if the comment is not found, return an error
    // delete the comment
    // return the deleted comment

    const {commentId} = req.params

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if(!deletedComment){
        throw new ApiError(500, "Failed to delete comment")
    }

    return new ApiResponse(
        200,
        "Successfully deleted comment",
        deletedComment
    )
})

export {
    getVideoComments,
    getTweetComments, 
    addCommentToVideo, 
    updateCommentToVideo,
    deleteCommentToVideo,
    addCommentToTweet,
    updateCommentToTweet,
    deleteCommentToTweet
    }