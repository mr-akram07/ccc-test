import express from "express";
import Result from "../models/Result.js";
import Question from "../models/Question.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📘 Public route for students to get questions (no auth)
router.get("/questions", async (req, res) => {
  try {
    const questions = await Question.find({}, { correctAnswer: 0 }); // hides correct answers
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🧾 Save student test result (with auth)
router.post("/submit", protect, async (req, res) => {
  try {
    const { name, rollNumber, answers, score, totalQuestions, percentage } = req.body;
    const result = await Result.create({
      student: req.user._id,
      name,
      rollNumber,
      answers,
      score,
      totalQuestions,
      percentage,
    });
    res.status(201).json({ message: "Result saved successfully", result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 📘 Fetch student’s test review (after submission)
router.get("/review", protect, async (req, res) => {
  try {
    const result = await Result.findOne({ student: req.user._id }).sort({ submittedAt: -1 });
    if (!result) return res.status(404).json({ message: "No result found" });

    const questions = await Question.find();

    // Merge with answers and mark correctness
    const review = questions.map((q, index) => {
      const userAnswer = result.answers[index];
      const isCorrect = userAnswer === q.correctAnswer;
      return {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer,
        isCorrect,
      };
    });

    res.json({ result, review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;
