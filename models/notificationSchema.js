const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema({
  message: {
    type: String,
    required: [true, "A notification message is required"],
    trim: true,
  },
}, {
  timestamps: true,
})

module.exports = mongoose.model("Notification", notificationSchema)
