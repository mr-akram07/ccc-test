import express from "express";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/user.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -----------------------------------
   🧾 ADMIN DASHBOARD STATS
------------------------------------ */
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalQuestions = await Question.countDocuments();

    const results = await Result.find();
    let averageScore = 0,
      highestScore = 0;

    if (results.length > 0) {
      const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
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
    res.status(500).json({ message: "Failed to load dashboard stats", error: err.message });
  }
});

/* -----------------------------------
   🧠 VIEW ALL RESULTS
------------------------------------ */
router.get("/results", protect, adminOnly, async (req, res) => {
  try {
    const results = await Result.find()
      .populate("student", "name rollNumber email")
      .sort({ createdAt: -1 });

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No results found" });
    }

    const formatted = results.map((r) => ({
      _id: r._id,
      name: r.student?.name || "Unknown",
      rollNumber: r.student?.rollNumber || "N/A",
      score: r.score,
      totalQuestions: r.totalQuestions,
      percentage: ((r.score / (r.totalQuestions || 1)) * 100).toFixed(2),
      submittedAt: r.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ message: "Failed to load results", error: err.message });
  }
});

/* -----------------------------------
   🧾 STUDENT REVIEW (BY ROLL NUMBER)
------------------------------------ */
router.get("/student/:rollNumber/review", protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findOne({ rollNumber: req.params.rollNumber });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await Result.findOne({ student: student._id })
      .populate("answers.question");

    if (!result)
      return res.status(404).json({ message: "No result found for this student" });

    const review = result.answers.map((a) => ({
      questionText: a.question?.questionText || "Question not found",
      questionTextHi: a.question?.questionTextHi || "",
      options: a.question?.options || [],
      optionsHi: a.question?.optionsHi || [],
      correctAnswer: a.question?.correctAnswer,
      userAnswer: a.selectedAnswer,
      isCorrect: a.isCorrect,
    }));

    res.json({
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
      },
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: ((result.score / (result.totalQuestions || 1)) * 100).toFixed(2),
      review,
    });
  } catch (err) {
    console.error("Error loading review:", err);
    res.status(500).json({ message: "Failed to load student review", error: err.message });
  }
});

/* -----------------------------------
   ✏️ ADD QUESTION
------------------------------------ */
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
      return res.status(400).json({ message: "Incomplete question details" });
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
    res.status(201).json({ message: "Question added successfully", question: newQuestion });
  } catch (err) {
    console.error("Add Question Error:", err);
    res.status(500).json({ message: "Failed to add question", error: err.message });
  }
});

/* -----------------------------------
   📋 GET ALL QUESTIONS
------------------------------------ */
router.get("/questions", protect, adminOnly, async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------
   ❌ DELETE QUESTION
------------------------------------ */
router.delete("/questions/:id", protect, adminOnly, async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Question not found" });
    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -----------------------------------
   ✏️ UPDATE QUESTION
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

    if (!updated) return res.status(404).json({ message: "Question not found" });

    res.json({ message: "Question updated successfully", question: updated });
  } catch (err) {
    console.error("Update Question Error:", err);
    res.status(500).json({ message: "Failed to update question", error: err.message });
  }
});

export default router;
