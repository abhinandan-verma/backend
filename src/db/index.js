import mongoose from "mongoose";
import { DB_NAME } from "../costants.js";

const connectDB = async () => {
    try{
       const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\n Mongodb connected !! db host: ${connectionInstance.connection.host}`)
    }catch(err){
        console.log("MONGODB connection FAILLED error: ", err);
        process.exit(1)
    }
}

export default connectDB