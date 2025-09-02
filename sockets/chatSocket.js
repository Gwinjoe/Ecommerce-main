//const { enterAllRooms, buildMsg } = require("./chatSocketUtils");
const Users = require("../models/userModel");
const Chats = require("../models/chatSchema");
const realtimechats = Chats.watch();

module.exports = (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.use((socket, next) => {
    if (socket.request.user) {
      next();
    } else {
      next(new Error('Unauthorized'));
    }
  });

  chatNamespace.on('connection', async (socket) => {
    const user = socket.request.user;
    const id = user._id;
    const isAdmin = user.admin;

    console.log(`[Chat] ${user.name} connected`);

    socket.on("getChatThreads", async () => {
      try {
        if (isAdmin) {
          console.log("[Chat] getChatThreads - admin");
          const existingChats = await Chats.find({ admin: id }).populate("user");
          if (!existingChats) return;
          socket.emit("chats_thread", existingChats);
        } else {
          console.log("[Chat] getChatThreads - user");
          const existingChat = await Chats.find({ user: id }).sort({ createdAt: -1 }).populate("admin");
          if (!existingChat || !existingChat.length) {
            const admins = await Users.find({ admin: true });
            const activeAdmins = admins.filter(a => a.active === true);
            const randomAdmin = activeAdmins.length
              ? activeAdmins[Math.floor(Math.random() * activeAdmins.length)]
              : admins[0];

            const newChat = new Chats({ user: id, admin: randomAdmin._id });
            const results = await newChat.save();
            socket.emit("chats_thread", results);
            chatNamespace.emit("updateChatThreads");
          }
          socket.emit("chats_thread", existingChat);
        }
      } catch (err) {
        console.error("[Chat] Error fetching chat threads:", err);
      }
    });

    socket.on('activity', (id) => {
      if (id) {
        socket.broadcast.to(id).emit('activity', { id });
      }
    });

    socket.on('message', async (msg) => {
      try {
        const roomId = msg.room;
        const message = buildMsg(msg.sender, msg.text);
        const existingRoom = await Chats.findById(roomId);
        if (!existingRoom) return;

        existingRoom.messages.push(message);
        const results = await existingRoom.save();

        chatNamespace.to(roomId).emit('message', {
          message: results.messages[results.messages.length - 1],
          room: roomId,
        });
      } catch (err) {
        console.error("[Chat] Error saving message:", err);
      }
    });

    socket.on('enterAllRooms', (rooms) => {
      if (rooms) {
        rooms.forEach((room) => {
          socket.join(room);
          console.log(`[Chat] ${user.name} joined ${room}`);
        });
      }
    });

    socket.on("read", async (id) => {
      try {
        const sender = isAdmin ? "user" : "support";
        const existingRoom = await Chats.findById(id);
        if (!existingRoom) return;

        existingRoom.messages.forEach((message) => {
          if (!message.read && message.sender === sender) {
            message.read = true;
          }
        });

        await existingRoom.save();
        chatNamespace.to(id).emit('updateMessage', { room: id, sender });
      } catch (err) {
        console.error("[Chat] Error marking messages as read:", err);
      }
    });

    realtimechats.on("change", async ({ documentKey }) => {
      try {
        const existingChat = await Chats.findById(documentKey._id);
        if (!existingChat) return;
        chatNamespace
          .to(existingChat.id)
          .emit("newNotification", {
            userUnreadMessages: existingChat.userUnreadMessages,
            supportUnreadMessages: existingChat.supportUnreadMessages,
            id: existingChat.id,
          });
      } catch (err) {
        console.error("[Chat] Error in change stream:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Chat] ${user.name} disconnected`);
    });
  });
};

