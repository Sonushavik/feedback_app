const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: {type: Number,default: 0},
  dislikes: {  type: Number,default: 0}
});

module.exports = mongoose.model("Feedback", feedbackSchema);
