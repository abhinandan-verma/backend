import mongoose from "mongoose";
import { DB_NAME } from "../costants.js";


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}${DB_NAME}`)
        console.log(`\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`.brightMagenta.bold);
    } catch (error) {
        console.log("MONGODB connection FAILED ".red.bold, error);
        process.exit(1)
    }
}

export default connectDB