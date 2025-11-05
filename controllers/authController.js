import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { name, rollNumber, password, role } = req.body;

    const exists = await User.findOne({ rollNumber });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      rollNumber,
      password,
      role: role || "student",
    });

    res.status(201).json({ message: "Registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    const user = await User.findOne({ rollNumber });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { name: user.name, rollNumber: user.rollNumber, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
