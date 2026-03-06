import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "node:http";

import { connectToSocket } from "./controller/socketManager.js";

import mongoose from "mongoose";

import cors from "cors";

import userRoutes from "./routes/users.routes.js";

//example
// import { dirname, join } from "node:path";
// import { fileURLToPath } from "node:url";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

// use the environment port if available, otherwise use 8000
app.set("port", (process.env.PORT) || 8000);
// use the CORS:- tellin the browser who is allowed to communicate with your backend
app.use(cors());
// read the JSON data 
app.use(express.json({limit: "40kb"}));
// read the form data like req.body
app.use(express.urlencoded({limit:"40kb", extended: true}));

// using routes in the app 
app.use("/api/v1/users", userRoutes);

// const __dirname = dirname(fileURLToPath(import.meta.url));

// app.get("/home", (req, res)=>{
//     return res.sendFile(join(__dirname, "index.html"));
// });

// io.on('connection', (socket)=>{
//     console.log('a user connected');
//     socket.on('disconnect', () => {
//     console.log('user disconnected');
//   });
//   socket.on('chat message', (msg) => {
//     console.log('message: ' + msg);
//     io.emit('chat message', msg);
//   });
// });

const start = async () => {
    // To make the altas databse connection
    const connectionDb = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MONGO connected DB host : ${connectionDb.connection.host}`);
    server.listen((app.get("port")), () => {
        console.log(`LISTENING ON PORT NO 8000`);
    });
}

start();