// Import Server class from socket.io
// This is used to create a real-time WebSocket server
import { Server } from "socket.io";

let connections = {}; // (Object to store active connections (room-wise or user-wise))to store how many users connected
let messages = {}; //(Object to store chat messages (can be room-based)) to store the chat messages
let timeOnline = {}; //(Object to track how long each user stayed online) how many time user online

export const connectToSocket = (server)=>{ // the connectToSocket are use to connect the http server to socket.io 
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods:["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    }); // Create new Socket.io server instance

    io.on("connection", (socket)=>{   // Listen for new client connections
        console.log("Something connected");
        socket.on("join-call", (path)=>{  // This event triggers when a user joins a call/room

            if(connections[path] === undefined){
                connections[path] = []
            }
            connections[path].push(socket.id);

            timeOnline[socket.id] = new Date();

            // also you can write this 
            // connections[path].forEach((elem)=>{
            //     io.to(elem);
            // })

            for (let a = 0; a < connections[path].length; a++){
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path]);
            }

            if(messages[path] !== undefined){
                for(let a = 0; a < messages[path].length; ++a){
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender']
                    )
                }
            }
        })

         // Used for WebRTC signaling (video/audio call setup)
        socket.on("signal", (toId, message)=>{ // Send signaling data to specific user  //toId = jis user ko bhejna hai
            io.to(toId).emit("signal", socket.id, message); // socket.id = kaun bhej rha hai
        })

         // Handle incoming chat messages
        socket.on("chat-message", (data, sender)=>{
            const [matchingRoom, found] = Object.entries(connections).reduce(([room, isFound], [roomKey, roomValue])=>{
                if(!isFound && roomValue.includes(socket.id)){
                    return [ roomKey, true];
                }
                return [room, isFound];
            }, ['', false]);

            if(found === true){
                if(messages[matchingRoom] === undefined){
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({'sender': sender, "data": data, "socket-id-sender": socket.id});
                console.log("message", matchingRoom, ":", sender, data);

                connections[matchingRoom].forEach((elem)=>{
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                })
            }
        })

        // Triggered when user disconnects
        socket.on("disconnect", ()=>{
            let diffTime = Math.abs(timeOnline[socket.id] - new Date())

            let key;

            for(const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))){
                
                for(let a = 0; a < v.length; ++a){
                    if(v[a] === socket.id){
                        key = k;

                        for(let a = 0; a < connections[key].length; ++a){
                            io.to(connections[key][a]).emit("user-left", socket.id)
                        }

                        let  index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1);

                        if(connections[key].length === 0){
                            delete connections[key];
                        }
                    }
                }
            }
        })
    })

    return io;
}