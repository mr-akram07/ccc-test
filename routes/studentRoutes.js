// server/routes/studentRoutes.js (apply these edits/replace old handlers with below)
import express from "express";
import Result from "../models/Result.js";
import Question from "../models/Question.js";
import User from "../models/user.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Simple in-memory cache for questions/correct answers ---
let questionsCache = null;
let questionsCacheAt = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds (tunable)

// helper: load questions minimally (no correctAnswer removed only for public GET)
async function loadQuestionsFromDBForClient() {
  // return all question fields except correctAnswer/correctAnswerIndex? We hide correctAnswer,
  // but we can include correctAnswerIndex=null removed by projection.
  const questions = await Question.find({}, { /* include needed fields for client */
    questionText: 1, options: 1, questionTextHi: 1, optionsHi: 1, createdAt: 1
  }).lean();
  return questions;
}

// helper: load correct answers map for scoring
async function loadCorrectMapFromDB() {
  // fetch only _id and correctAnswerIndex (and options/correctAnswer fallback)
  const rows = await Question.find({}, { correctAnswerIndex: 1, correctAnswer: 1 }).lean();
  // Build array map: keep order consistent with how front-end expects answers array (index order)
  // We'll use the order returned by DB — front-end supplies answers in that same order (it loaded them that way).
  const map = rows.map((r) => ({
    qid: r._id.toString(),
    correctIndex: typeof r.correctAnswerIndex === "number" ? r.correctAnswerIndex : null,
    correctAnswerText: r.correctAnswer ?? null,
  }));
  return map;
}

// GET /questions (public) — use cache and return no-correct fields
router.get("/questions", async (req, res) => {
  try {
    // If cache valid, return it
    if (questionsCache && Date.now() - questionsCacheAt < CACHE_TTL_MS) {
      return res.json(questionsCache.clientView);
    }

    // else load from DB and set cache
    const clientQuestions = await loadQuestionsFromDBForClient();

    // store both clientView and scoring map in cache
    const correctMap = await loadCorrectMapFromDB();
    questionsCache = {
      clientView: clientQuestions,
      correctMap, // used for scoring
    };
    questionsCacheAt = Date.now();

    res.json(clientQuestions);
  } catch (err) {
    console.error("Fetch questions error:", err);
    res.status(500).json({ message: "Server error while fetching questions" });
  }
});

// POST /submit — uses cached correctMap when available (reduces DB reads on spike)
router.post("/submit", protect, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid answers format" });
    }

    // Use authenticated user already from protect middleware
    const student = req.user;
    if (!student) return res.status(401).json({ message: "Unauthorized" });

    // Ensure we have correctMap in cache (either recently loaded or fetch now)
    let correctMap = questionsCache?.correctMap;
    if (!correctMap || Date.now() - questionsCacheAt >= CACHE_TTL_MS) {
      // Refresh cache (but keep clientView null if not needed)
      const loadedMap = await loadCorrectMapFromDB();
      questionsCache = questionsCache || {};
      questionsCache.correctMap = loadedMap;
      questionsCacheAt = Date.now();
      correctMap = loadedMap;
    }

    // Score the answers. We expect answers array to be in same order as clientQuestions.
    let score = 0;
    const totalQuestions = correctMap.length;
    const resultAnswers = [];

    for (let i = 0; i < totalQuestions; i++) {
      const correctInfo = correctMap[i];
      const selectedIndex = typeof answers[i] === "number" ? answers[i] : null;

      const isCorrect = selectedIndex !== null && correctInfo.correctIndex === selectedIndex;
      if (isCorrect) score++;

      // store question ObjectId ref (we have _id in correctMap? we stored string)
      const questionId = correctInfo.qid; // string id
      resultAnswers.push({
        question: questionId,
        selectedAnswer: selectedIndex !== null ? String(selectedIndex) : null,
        // Keep isCorrect boolean for quick queries
        isCorrect,
      });
    }

    const percentage = Math.round((score / (totalQuestions || 1)) * 100);

    // Save single Result document (one DB write) — fast
    const resultDoc = new Result({
      student: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      answers: resultAnswers,
      score,
      totalQuestions,
      percentage,
    });

    await resultDoc.save();

    return res.status(201).json({
      message: "✅ Test submitted successfully",
      score,
      totalQuestions,
      percentage,
    });
  } catch (err) {
    console.error("❌ Submit test error:", err);
    return res.status(500).json({ message: err.message || "Server error while submitting test" });
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