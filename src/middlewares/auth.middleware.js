import httpStatus from "http-status";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

const verifyToken = async (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({message:"No token provided."});
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        const user = await User.findById(decoded.id);

        if(!user){
            return res.status(httpStatus.NOT_FOUND).json({message:"User not found."});
        }

        next();

    } catch(e){
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message:e.message});
    }
}

export default verifyToken;