const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  receiver: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// export model user with MessageSchema
module.exports = mongoose.model("message", MessageSchema);
