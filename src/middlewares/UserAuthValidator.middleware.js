import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

// register validator

const registerValidator = asyncHandler(async (req, _, next) => {
    try {
        const { username, email, password, fullName } = req.body;
        
        if (!username || !email || !password || !fullName) {
            throw new ApiError(400, "Username, email and password are required");
        }
        
        if (username.trim() === "" || email.trim() === "" || password.trim() === "" || fullName.trim() === "") {
            throw new ApiError(400, "Username, email and password are required");
        }
        
        const isValidEmail = emailValidator.validate(email);
        if (!isValidEmail) {
            throw new ApiError(400, "Invalid email address");
        }
        // check if username already exists
        const ifUserExists = await User.findOne({ 
            $or: [{ username }, { email }]
        });
        if (ifUserExists) {
            throw new ApiError(400, "Username or email already exists");
        }
        
        next();
    } catch (error) {
        throw new ApiError(400, error.message || "register validation : Invalid request");
    }
    });

    // login validator
    const loginValidator = asyncHandler(async (req, _, next) => {
        try {
            const { username, password, email } = req.body;
            if (!username || !password || !email) {
                throw new ApiError(400, "Username, email and password are required");
            }
            if (username.trim() === "" || password.trim() === "" || email.trim() === ""){
                throw new ApiError(400, "Username, email and password are required");
            }

            // check if username already exists
            const ifUserExists = await User.findOne({ 
                $or: [{ username }, { email }]
            });

            if (!ifUserExists) {
                throw new ApiError(400, "Invalid username or email");
            }   

            // check the user's password
            const isPasswordValid = await bcrypt.compare(password, ifUserExists.password);
            if (!isPasswordValid) {
                throw new ApiError(400, "Invalid password");
            }
            req.user = ifUserExists;
            next();
        } catch (error) {
            throw new ApiError(400, error.message || "login validation : Invalid request");
        }
    });

    export { 
        registerValidator, 
        loginValidator 
    };