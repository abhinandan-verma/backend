import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    // build a healthcheck response that simply returns the OK status as json with a message

    const healthCheckUp = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: Date.now(),
        responseTime: process.hrtime()
    }

    try {
        return new ApiResponse(200, "Healthcheck successful -> OK", healthCheckUp)
    } catch (error) {
        console.error("Error in healthcheck", error)
        return new ApiError(500, "getting error in health check", error)
    }
})

export {
    healthcheck
    }
    