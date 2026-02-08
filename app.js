import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 4000;

app.use(express.static("public"));

// [Storage] Array to store all papercut history
let papercutHistory = [];

server.listen(port, () => {
  console.log("listening on: " + port);
});

io.on("connection", (socket) => {
  console.log("a user connected: " + socket.id);

  // [History] Send existing history to the new user immediately
  socket.emit("history", papercutHistory);

  // [Receive] When a user sends a new papercut
  socket.on("newPapercut", (data) => {
    // 1. Add to history storage
    papercutHistory.push(data);
    
    // 2. Limit history size to 100 to prevent server overload
    if (papercutHistory.length > 100) {
      papercutHistory.shift(); // Remove the oldest one
    }

    // 3. Broadcast to everyone else
    socket.broadcast.emit('showOnWall', data);
  });

  // [Delete] When a user wants to delete a specific papercut
  socket.on("deletePapercut", (idToDelete) => {
    console.log("Request to delete ID:", idToDelete);
    
    // 1. Remove it from server storage
    papercutHistory = papercutHistory.filter(item => item.id !== idToDelete);
    
    // 2. Tell everyone to remove it from their screen
    io.emit('removePapercut', idToDelete);
  });
});
