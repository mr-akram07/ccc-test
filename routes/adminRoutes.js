import express from "express";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/user.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------
   🧾 ADMIN DASHBOARD STATS
-------------------------------- */
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    // ✅ Total registered students
    const totalStudents = await User.countDocuments({ role: "student" });

    // ✅ Total questions in the question bank
    const totalQuestions = await Question.countDocuments();

    // ✅ Results-based calculations
    const results = await Result.find();

    let averageScore = 0;
    let highestScore = 0;

    if (results.length > 0) {
      const totalScore = results.reduce((acc, r) => acc + (r.score || 0), 0);
      averageScore = (totalScore / results.length).toFixed(2);
      highestScore = Math.max(...results.map((r) => r.score || 0));
    }

    res.json({
      totalStudents,
      totalQuestions,
      averageScore,
      highestScore,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res
      .status(500)
      .json({ message: "Failed to load stats", error: err.message });
  }
});

/* -------------------------------
   ADD A NEW QUESTION (Bilingual)
-------------------------------- */
router.post("/questions/add", protect, adminOnly, async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      correctAnswerIndex,
      questionTextHi,
      optionsHi,
    } = req.body;

    if (!questionText || !options || options.length < 2 || !correctAnswer) {
      return res
        .status(400)
        .json({ message: "Incomplete question details" });
    }

    const newQuestion = new Question({
      questionText,
      options,
      correctAnswer,
      correctAnswerIndex: correctAnswerIndex ?? null,
      questionTextHi: questionTextHi || "",
      optionsHi: optionsHi && optionsHi.length ? optionsHi : [],
    });

    await newQuestion.save();
    res
      .status(201)
      .json({ message: "Question added successfully", question: newQuestion });
  } catch (err) {
    console.error("Add Question Error:", err);
    res
      .status(500)
      .json({ message: "Failed to add question", error: err.message });
  }
});

/* -------------------------------
   GET ALL QUESTIONS (Admin View)
-------------------------------- */
router.get("/questions", protect, adminOnly, async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------
   DELETE QUESTION
-------------------------------- */
router.delete("/questions/:id", protect, adminOnly, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Question not found" });
    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------
   UPDATE QUESTION (Edit)
------------------------------------ */
router.put("/questions/:id", protect, adminOnly, async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      correctAnswerIndex,
      questionTextHi,
      optionsHi,
    } = req.body;

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      {
        questionText,
        options,
        correctAnswer,
        correctAnswerIndex,
        questionTextHi,
        optionsHi,
      },
      { new: true, runValidators: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Question not found" });

    res.json({ message: "Question updated successfully", question: updated });
  } catch (err) {
    console.error("Update Question Error:", err);
    res
      .status(500)
      .json({ message: "Failed to update question", error: err.message });
  }
});

export default router;
