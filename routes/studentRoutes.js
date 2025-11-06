// server/routes/studentRoutes.js
import express from "express";
import Result from "../models/Result.js";
import Question from "../models/Question.js";
import User from "../models/user.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -----------------------------------
   📘 GET QUESTIONS (Public)
------------------------------------ */
router.get("/questions", async (req, res) => {
  try {
    const questions = await Question.find({}, { correctAnswer: 0 }); // hide correct answers
    res.json(questions);
  } catch (err) {
    console.error("Fetch questions error:", err);
    res.status(500).json({ message: "Server error while fetching questions" });
  }
});

/* -----------------------------------
   🧾 SUBMIT TEST (Protected)
------------------------------------ */
router.post("/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid answers data" });
    }

    const student = await User.findById(req.user._id);
    const questions = await Question.find();

    if (!questions.length) {
      return res.status(400).json({ message: "No questions available" });
    }

    let score = 0;
    const totalQuestions = questions.length;

    // build result answers
    const resultAnswers = questions.map((q, i) => {
      const selectedIndex = answers[i];
      const correctIndex =
        typeof q.correctAnswerIndex === "number"
          ? q.correctAnswerIndex
          : q.options.findIndex((o) => o === q.correctAnswer);

      const isCorrect = selectedIndex === correctIndex;
      if (isCorrect) score++;

      return {
        question: q._id,
        selectedAnswer:
          typeof selectedIndex === "number" && q.options[selectedIndex]
            ? q.options[selectedIndex]
            : null,
        isCorrect,
      };
    });

    const percentage = Math.round((score / totalQuestions) * 100);

    const result = new Result({
      student: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      answers: resultAnswers,
      score,
      totalQuestions,
      percentage,
    });

    await result.save();

    res.status(201).json({
      message: "✅ Test submitted successfully",
      score,
      totalQuestions,
      percentage,
    });
  } catch (err) {
    console.error("Submit test error:", err);
    res.status(500).json({ message: "Server error while submitting test" });
  }
});

/* -----------------------------------
   📋 REVIEW TEST (Protected)
------------------------------------ */
router.get("/review", protect, async (req, res) => {
  try {
    const result = await Result.findOne({ student: req.user._id }).populate(
      "answers.question"
    );

    if (!result) {
      return res.status(404).json({ message: "No test result found" });
    }

    const review = result.answers.map((a) => ({
      questionText: a.question?.questionText || "Question not found",
      options: a.question?.options || [],
      correctAnswer: a.question?.correctAnswer,
      userAnswer: a.selectedAnswer,
      isCorrect: a.isCorrect,
    }));

    res.json({
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      review,
    });
  } catch (err) {
    console.error("Review fetch error:", err);
    res.status(500).json({ message: "Server error while loading review" });
  }
});

export default router;
