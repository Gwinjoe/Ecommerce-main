const { Server } = require('socket.io');
const wrap = require('../../middlewares/wrapMiddleware');
const passport = require('passport');
const { enterAllRooms, buildMsg } = require("./chatSocket");
const Users = require("../../models/userModel")
const Chats = require("../../models/chatSchema")
const realtimechats = Chats.watch();

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

    console.log(user.name + " connected")

    socket.on("getChatThreads", async () => {
      try {
        if (isAdmin) {
          console.log("i am getChatThreads - admin")
          const existingChats = await Chats.find({ admin: id }).populate("user");
          if (!existingChats) {
            return;
          }
          socket.emit("chats_thread", existingChats);
        } else {

          console.log("i am getChatThreads - user")
          const existingChat = await Chats.find({ user: id }).sort({ createdAt: -1 }).populate("admin");
          // console.log("user chats Thread : " + existingChat);
          if (!existingChat || !existingChat.length) {
            const admins = await Users.find({ admin: true });
            const activeAdmins = admins.length > 1 ? admins.map((admin) => {
              if (admin.active === true) {
                return admin
              }
            }) : admins;
            //  console.log(activeAdmins)
            const randomIndex = Math.floor(Math.random() * activeAdmins.length);
            const randomAdmin = activeAdmins[randomIndex];
            // console.log(randomAdmin)
            const newChat = new Chats({
              user: id,
              admin: randomAdmin._id,
            })

            const results = await newChat.save();
            socket.emit("chats_thread", results)
            io.broadcast.emit("updateChatThreads")
          }
          socket.emit("chats_thread", existingChat);
        }
      } catch (err) {
        console.log(err)
      }

    })

    socket.on('activity', (id) => {
      if (id) {
        socket.broadcast.to(id).emit('activity')
      }
    })


    socket.on('message', async (msg) => {
      const roomId = msg.room;
      const message = buildMsg(msg.sender, msg.text)


      const existingRoom = await Chats.findById(roomId)
      if (!existingRoom) {
        return;
      }

      existingRoom.messages.push(message)

      const results = await existingRoom.save();

      io.to(roomId).emit('message', { message: results.messages[results.messages.length - 1], room: roomId });
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

      const sender = isAdmin ? "user" : "support";
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

      io.to(id).emit('updateMessage', { room: id, sender });

    })

    realtimechats.on("change", async ({ documentKey }) => {
      const existingChat = await Chats.findById(documentKey._id);
      if (!existingChat) {
        console.log("no chat matches that id");
        return;
      }
      io.to(existingChat.id).emit("newNotification", { userUnreadMessages: existingChat.userUnreadMessages, supportUnreadMessages: existingChat.supportUnreadMessages, id: existingChat.id })
    })

    socket.on('disconnect', () => {
      console.log(`${user.name} disconnected`);
    });
  });
};

