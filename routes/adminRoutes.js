import express from "express";
import Question from "../models/Question.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

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

    // basic validation
    if (!questionText || !options || options.length < 2 || !correctAnswer) {
      return res.status(400).json({ message: "Incomplete question details" });
    }

    // create question
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
    if (!deleted) return res.status(404).json({ message: "Question not found" });
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
    res.status(500).json({ message: "Failed to update question", error: err.message });
  }
});


export default router;
