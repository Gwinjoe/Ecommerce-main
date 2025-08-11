const { Server } = require('socket.io');
const wrap = require('../../middlewares/wrapMiddleware');
const passport = require('passport');
const { enterAllRooms, buildMsg } = require("./chatSocket");
const Users = require("../../models/userModel")
const Chats = require("../../models/chatSchema")

module.exports = function(server, sessionMiddleware) {
  const io = new Server(server);

  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));

  io.use((socket, next) => {
    if (socket.request.user) {
      next();
    } else {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.request.user;
    const id = user._id;
    const isAdmin = user.admin;
    let chats = []

    socket.on('message', async (msg) => {
      const roomId = msg.room;
      console.log(roomId);
      const message = buildMsg(msg.sender, msg.text)

      console.log(`${user.email}: ${msg}`);
      // Broadcast to admin or whoever is supposed to receive
      const existingRoom = await Chats.findById(roomId)
      if (!existingRoom) {
        return;
      }

      existingRoom.messages.push(message)

      const results = await existingRoom.save();

      io.to(roomId).emit('message', { message: results.messages[results.messages.length - 1], room: roomId });
      console.log({ room: roomId, message: results.messages[results.messages.length - 1] });
    });
    socket.on('enterAllRooms', (rooms) => {
      if (rooms) {
        rooms.forEach((room) => {
          socket.join(room);
          console.log(`${user.name} just joined ${room}`)
        })
      }
    }
    );

    socket.on("read", async (id) => {

      const sender = isAdmin ? "support" : "user";
      const existingRoom = await Chats.findById(id)
      if (!existingRoom) {
        return;
      }

      existingRoom.messages.forEach((message) => {
        if (!message.read && message.sender === sender) {
          message.read = true;
        }
      })

      await existingRoom.save();

      io.to(id).emit('updateMessage', { room: id });

    })

    socket.on('disconnect', () => {
      console.log(`${user.name} disconnected`);
    });
  });
};

