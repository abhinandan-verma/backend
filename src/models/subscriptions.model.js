import mongoose, { Schema} from "mongoose";
import { asyncHandler } from "../utlis/asyncHandler";

const subscriptionsSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // one who is being subscribed
        ref: "User"
    }
},
{timestamps: true}
)



export const Subscription = mongoose.model("Subscription", subscriptionsSchema)
