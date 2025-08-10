const Users = require("../../models/userModel")
const Chats = require("../../models/chatSchema")



function buildMsg(sender, text, read = false) {
  return {
    sender: sender,
    text,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date()),
    read
  }
}

module.exports = { buildMsg }
