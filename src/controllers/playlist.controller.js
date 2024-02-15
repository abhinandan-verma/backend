import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"

// create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if((!name || name.trim() === "") || (!description || description.trim() === "")){
        throw new ApiError(400, "Name and description are required")
    }

    // create the playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if(!playlist){
        throw new ApiError(500, "Unable to create playlist")
    }

    // send the response
    return res.status(201).json(
        new ApiResponse(
            201, 
            playlist,
            "Playlist created successfully"
        ).toObject()
    )
})

// get user playlists by user id
const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    // get user playlists
    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                playlist: {
                    $first: "$videos"
                }
            }
        }
    ])

    if(!playlists){
        throw new ApiError(500, "Unable to get user playlists")
    }

    // send the response
    return res.status(200).json(
        new ApiResponse(
            200, 
            playlists
        ).toObject()
    )
})

// get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    console.log(playlistId)

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    // get playlist by id
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    // send the response
    return res.status(200).json(
        new ApiResponse(
            200, 
            playlist,
            "Playlist retrieved successfully"
        ).toObject()
    )
})

// add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlist or video id")
    }
    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found in the database")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to add video to this playlist")
    }

    // check if video exists
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found in the database")
    }

    // if video already exists in the playlist
    if(playlist.videos.includes(videoId)){
        throw new ApiError(400, "Video already exists in the playlist")
    }

    // add video to playlist
   const addedToPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
         $push: {
              videos: videoId
         }
        },
        {
            new: true
        }
    )

    if(!addedToPlaylist){
        throw new ApiError(500, "Unable to add video to playlist")
    }


})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlist or video id")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found in the database")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to remove video from this playlist")
    }

    // check if video exists
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found in the database")
    }

    // if video does not exist in the playlist
    if(!playlist.videos.includes(videoId)){
        throw new ApiError(400, "Video does not exist in the playlist")
    }

    // remove video from playlist
    const removedFromPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $pull: {
            videos: videoId
        }
    },
    {
        new: true
    }
    )

    if(!removedFromPlaylist){
        throw new ApiError(500, "Unable to remove video from playlist")
    }

    // send the response
    return res.status(200).json(
        new ApiResponse(
            200, 
            removedFromPlaylist,
            "Video removed from playlist successfully"
        ).toObject()
    )

})

// delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found in the database")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this playlist")
    }

    // delete playlist
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!deletedPlaylist){
        throw new ApiError(500, "Unable to delete playlist")
    }

    // send the response
    return res.status(200).json(
        new ApiResponse(
            200, 
            deletedPlaylist,
            "Playlist deleted successfully"
        ).toObject()
    )
})

// update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    // check if playlist exists
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found in the database")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this playlist")
    }

    // update playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {
           $set: {
                name,
                description
           }
    },
    {
        new: true
    }
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "Unable to update playlist")
    }

    // send the response
    return res.status(200).json(
        new ApiResponse(
            200, 
            updatedPlaylist,
            "Playlist updated successfully"
        ).toObject()
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}