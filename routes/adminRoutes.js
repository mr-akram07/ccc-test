import express from "express";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/user.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* 
============================
🔹 QUESTIONS MANAGEMENT
============================
*/

// ➕ Add New Question
router.post("/question", protect, adminOnly, async (req, res) => {
  try {
    const { questionText, options, correctAnswer } = req.body;

    if (!questionText || !options || !correctAnswer) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const question = await Question.create({ questionText, options, correctAnswer });
    res.status(201).json({ message: "Question added successfully", question });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 Public route for students to get all questions
router.get("/public/questions", async (req, res) => {
  try {
    const questions = await Question.find().select("-__v"); // exclude __v field
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 📋 Get All Questions
router.get("/questions", protect, adminOnly, async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✏️ Edit Question by ID
router.put("/question/:id", protect, adminOnly, async (req, res) => {
  try {
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) return res.status(404).json({ message: "Question not found" });
    res.json({ message: "Question updated successfully", updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🗑️ Delete Question by ID
router.delete("/question/:id", protect, adminOnly, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Question not found" });
    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* 
============================
📊 STUDENT RESULTS
============================
*/

// 🧾 View All Student Results
router.get("/results", protect, adminOnly, async (req, res) => {
  try {
    const results = await Result.find().sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* 
============================
📈 DASHBOARD STATS
============================
*/

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalQuestions = await Question.countDocuments();
    const results = await Result.find();

    let averageScore = 0;
    let highestScore = 0;

    if (results.length > 0) {
      const total = results.reduce((sum, r) => sum + r.score, 0);
      averageScore = (total / results.length).toFixed(2);
      highestScore = Math.max(...results.map((r) => r.score));
    }

    res.json({
      totalStudents,
      totalQuestions,
      averageScore,
      highestScore,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 👨‍🏫 Admin view: get full answers of a student
router.get("/student/:rollNumber/review", protect, adminOnly, async (req, res) => {
  try {
    const result = await Result.findOne({ rollNumber: req.params.rollNumber });
    if (!result) return res.status(404).json({ message: "No result found for this student" });

    const questions = await Question.find();
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

    res.json({ student: result.name, rollNumber: result.rollNumber, review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;
