import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  rollNumber: { type: String, required: true },
  answers: { type: Array, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Result", resultSchema);
