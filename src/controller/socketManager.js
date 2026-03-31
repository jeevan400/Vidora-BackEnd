import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  // the connectToSocket are use to connect the http server to socket.io
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  }); // Create new Socket.io server instance

  const max_user = 4;
  io.on("connection", (socket) => {
    socket.on("join-call", (path) => {
      // set the limit of user
      if (connections[path] && connections[path].length >= max_user) {
        io.to(socket.id).emit("room-full"); // reject user
        return;
      }

      if (connections[path] === undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);

      timeOnline[socket.id] = new Date();

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path],
        );
      }

      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            {
              text: messages[path][a]["data"],
              replyTo: messages[path][a]["replyTo"],
              msg_id: messages[path][a]["msg_id"],
            },
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"],
          );
        }
      }
    });

    // Used for WebRTC signaling (video/audio call setup)
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // Handle incoming chat messages
    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }

        messages[matchingRoom].push({
          sender: sender,
          data: data.text,
          replyTo: data.replyTo || null,
          msg_id: data.msg_id,
          "socket-id-sender": socket.id,
        });
        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    // handle edit message
    socket.on("edit-message", (data) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        // update stored messages
        if (messages[matchingRoom]) {
          messages[matchingRoom] = messages[matchingRoom].map((msg) =>
            msg["msg_id"] === data.id ? { ...msg, data: data.message } : msg,
          );
        }

        // send to all users in room
        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("edit-message", data);
        });
      }
    });

    // delete message
    socket.on("delete-message", (data) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        if (messages[matchingRoom]) {
          const message = messages[matchingRoom].find(
            (msg) => msg.msg_id === data.id,
          );

          // if owner delete for evenryone
          if (message && message["socket-id-sender"] === socket.id) {
            messages[matchingRoom] = messages[matchingRoom].filter(
              (msg) => msg.msg_id !== data.id,
            );

            connections[matchingRoom].forEach((elem) => {
              io.to(elem).emit("delete-message", data.id);
            });
          } else {
            // Not owner delete only for this user
            io.to(socket.id).emit("delete-message", data.id);
          }
        }
      }
    });

    socket.on("leave-call", (data, callback) => {
      let key;

      for (const [k, v] of Object.entries(connections)) {
        if (v.includes(socket.id)) {
          key = k; // this store the room

          connections[key] = connections[key].filter((id) => id !== socket.id);

          // notify others
          connections[key].forEach((id) => {
            io.to(id).emit("user-left", socket.id);
          });

          if (connections[key].length === 0) {
            delete connections[key];
          }
          break;
        }
      }

      if (callback) callback();
    });
    // Triggered when user disconnects
    socket.on("disconnect", () => {
      let diffTime = Math.abs(timeOnline[socket.id] - new Date());

      let key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections)),
      )) {
        for (let a = 0; a < v.length; ++a) {
          if (v[a] === socket.id) {
            key = k;

            for (let a = 0; a < connections[key].length; ++a) {
              io.to(connections[key][a]).emit("user-left", socket.id);
            }

            let index = connections[key].indexOf(socket.id);

            connections[key].splice(index, 1);

            if (connections[key].length === 0) {
              delete connections[key];
            }
          }
        }
      }
    });
  });

  return io;
};
