// server.js (apply these edits)
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression"; // new

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

dotenv.config();
const app = express();

// --- middlewares ---
app.use(cors());
app.use(express.json());
app.use(compression()); // compress responses (gzip) — reduces bandwidth at start spike

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

// MongoDB Connection — increase pool for concurrency
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // set a generous pool size for handling many simultaneous connections
    // tweak depending on hosting / Atlas connection limits
    maxPoolSize: 50,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Root route
app.get("/", (req, res) => {
  res.send("🚀 CCC Mock Test Server Running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
