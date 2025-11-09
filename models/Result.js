import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question", // ✅ Links each answer to its Question document
    required: true,
  },
  // 🔧 Allow unattempted questions (no selected answer)
  selectedAnswer: { type: String, required: false, default: null },
  isCorrect: { type: Boolean, default: false },
});

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    answers: [answerSchema], // ✅ Uses sub-schema
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Result", resultSchema);