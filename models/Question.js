import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  // English version (already present)
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],

  // Hindi version (optional for now)
  questionTextHi: { type: String, default: "" },
  optionsHi: [{ type: String, default: "" }],

  // Answer (can store either index or text)
  correctAnswer: { type: String, required: true },
  correctAnswerIndex: { type: Number, default: null },

  // Metadata (optional)
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Question", questionSchema);
