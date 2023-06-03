const serverless = require("serverless-http");

const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

var colors = [
  "#E53935",
  "#D81B60",
  "#8E24AA",
  "#5E35B1",
  "#3949AB",
  "#1E88E5",
  "#039BE5",
  "#00ACC1",
  "#00897B",
  "#43A047",
  "#7CB342",
  "#C0CA33",
  "#FDD835",
  "#FFB300",
  "#FB8C00",
  "#F4511E",
  "#6D4C41",
  "#757575",
  "#546E7A",
];
const users = new Map(); // Map to store users with socket IDs as keys
const channels = new Map(); // Map to store channels with connected users as values

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // Socket.IO disconnect event
  socket.on("disconnect", () => {
    // Remove user from connected users and channels when disconnected
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      users.delete(socket.id);
      const channel = user.channel;
      if (channels.has(channel)) {
        const channelUsers = channels.get(channel);
        channelUsers.delete(socket.id);
        channels.set(channel, channelUsers);
        // Emit updated member list to all clients in the channel
        io.to(channel).emit("memberList", Array.from(channelUsers.values()));
        console.log(`User ${user.name} left channel ${channel}`);

        if (channelUsers?.size === 0) {
          console.log("Channel is empty: ", channelUsers, channels);
        }
      }
    }
    console.log("A user disconnected");
  });

  // Socket.IO event for joining a channel with user object
  socket.on("joinChannel", (channel, user) => {
    socket.join(channel); // Join the specified channel
    socket.user = user; // Set the user object as a property of the socket object
    users.set(socket.id, user); // Store user with socket ID as key in the users map
    user.channel = channel; // Store the channel information in the user object
    user["color"] = colors[Math.floor(Math.random() * colors.length)];
    if (!channels.has(channel)) {
      channels.set(channel, new Map());
    }
    const channelUsers = channels.get(channel);
    channelUsers.set(socket.id, user); // Store user with socket ID as key in the channelUsers map
    channels.set(channel, channelUsers);
    // Emit updated member list to all clients in the channel
    io.to(channel).emit("memberList", Array.from(channelUsers.values()));
    console.log(`User ${user.name} joined channel "${channel}"`);
  });

  // Socket.IO event for leaving a channel
  socket.on("leaveChannel", (channel) => {
    socket.leave(channel); // Leave the specified channel
    const user = users.get(socket.id);
    if (channels.has(channel) && user) {
      const channelUsers = channels.get(channel);
      channelUsers.delete(socket.id);
      channels.set(channel, channelUsers);
      // Emit updated member list to all clients in the channel
      io.to(channel).emit("memberList", Array.from(channelUsers.values()));
      console.log(`User ${user.name} left channel ${channel}`);
    }
  });

  // Socket.IO event for sending codes
  socket.on("code", (channel, code) => {
    io.to(channel).emit("code", socket.user, code); // Emit the 'newCode' event to all clients in the channel along with the user object

    console.log(
      `User ${socket?.user?.name} sent a code in channel ${channel}: ${code}`
    );
  });
});

server.listen(process.env.PORT || 8001, () => {
  console.log("listening on *:3000");
});

module.exports.handler = serverless(app);
