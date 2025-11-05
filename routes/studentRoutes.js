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
    const { answers } = req.body;
    const student = await User.findById(req.user._id);
    const questions = await Question.find();

    if (!questions.length) {
      return res.status(400).json({ message: "No questions available" });
    }

    let score = 0;

    // ✅ Create answer array with linked question IDs
    const resultAnswers = questions.map((q, index) => {
      const selected = answers[index];
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return {
        question: q._id, // ✅ links to the actual Question
        selectedAnswer: selected,
        isCorrect,
      };
    });

    const result = new Result({
      student: req.user._id,
      name: student.name,
      rollNumber: student.rollNumber,
      answers: resultAnswers, // ✅ linked answers
      score,
      totalQuestions: questions.length,
      percentage: ((score / questions.length) * 100).toFixed(2),
    });

    await result.save();
    res.json({ message: "✅ Test submitted successfully", result });
  } catch (err) {
    console.error("Submit Error:", err);
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
