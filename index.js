const express = require("express");
const app = express();

let broadcaster;
const port = 4000;

const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server);
app.use(express.static(__dirname + "/public"));

function getRandomString(length = 6) {
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for ( var i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

class Room {
  constructor(broadcaster) {
    this.broadcaster = broadcaster
    this.roomID = getRandomString()
    this.watchers = []
  }

  gotWatcher (socket) {
    this.watchers.push(socket.id)
    socket.to(this.broadcaster).emit('watcher', socket.id)
  }

  gotBroadcaster (socket) {
    this.broadcaster = socket.id
    socket.broadcast.to(this.roomID).emit('broadcaster')
  }

  disconnectWatcher (socket) {
    if (this.watchers[socket.id] !== undefined) {
      socket.to(this.broadcaster).emit('disconnectPeer', socket.id)
      delete this.watchers[socket.id]
    }
  }
}

let rooms = {}
let userInRoom = {}

io.sockets.on("error", (e) => console.log(e));
io.sockets.on("connection", (socket) => {
  socket.on("room", (id) => {
    console.log("in room")
    if (id === undefined || rooms[id] === undefined) {
      let room = new Room(socket.id)
      rooms[room.roomID] = room
      id = room.roomID
    }
    userInRoom[socket.id] = id
    socket.emit('joinedRoom', id)
  })

  socket.on("broadcaster", () => {
    if (userInRoom[socket.id] !== undefined) {
      rooms[userInRoom[socket.id]].gotBroadcaster(socket)
    }
  });

  socket.on("needNegotiation", (id) => {
    socket.to(id).emit('requestedNegotiation', socket.id)
  })

  socket.on("watcher", () => {
    if (userInRoom[socket.id] !== undefined) {
      rooms[userInRoom[socket.id]].gotWatcher(socket)
    }
  });

  socket.on("offer", (id, message) => {
    socket.to(id).emit("offer", socket.id, message);
  });

  socket.on("answer", (id, message) => {
    socket.to(id).emit("answer", socket.id, message);
  });

  socket.on("candidate", (id, message) => {
    socket.to(id).emit("candidate", socket.id, message);
  });

  socket.on("disconnect", () => {
    if (userInRoom[socket.id] !== undefined) {
      rooms[userInRoom[socket.id]].disconnectWatcher(socket)
    }
  });
});

server.listen(port, () => console.log(`Server is running on port ${port}`));
