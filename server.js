const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Task = require("./models/Task");
const User = require("./models/User");
const authMiddleware = require("./middleware/auth");
const { validateTask, validateAuth } = require("./middleware/validate");

// Practical 9: In-Memory Caching Module
const { cache, getStats, recordHit, recordMiss } = require("./cache");

// Practical 10: Event-Driven Architecture Module
const taskEvents = require("./events");
require("./listeners"); // Register async event listeners

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_24dit026";

// Middleware
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toLocaleString()}`);
  next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskDB";
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Failed:", err.message);
  });

// Home Route
app.get("/", (req, res) => {
  res.send("Task Manager API (Practicals 4-13) is Running!");
});

// ==================== PRACTICAL 9: DEBUG CACHE ENDPOINT ====================
app.get("/debug/cache-stats", (req, res) => {
  res.status(200).json({
    success: true,
    stats: getStats()
  });
});

// ==================== PRACTICAL 13: AI DESCRIPTION ENDPOINT ====================
app.post("/api/ai/generate-description", async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: "Title is required for AI generation" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.startsWith("sk-")) {
      const { OpenAI } = require("openai");
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Write a concise 2-sentence task description for: ${title}` }]
      });
      const aiText = completion.choices[0].message.content;
      return res.status(200).json({ description: aiText, fallback: false });
    }

    // Graceful Fallback if API Key not set or demo mode
    const fallbackDescription = `Auto-generated workflow for "${title}": 1. Review functional requirements and data models. 2. Implement unit tests and verify deployment pipeline.`;
    return res.status(200).json({
      description: fallbackDescription,
      fallback: true,
      notice: "AI fallback mode active (Server-side key safe in .env)"
    });
  } catch (err) {
    // Graceful Degradation - Never crash main app
    return res.status(200).json({
      description: `Task breakdown for "${title}": Complete implementation and perform QA testing.`,
      fallback: true,
      error: err.message
    });
  }
});

// ==================== AUTHENTICATION ROUTES ====================

// POST - User Registration
app.post("/register", validateAuth, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email address."
      });
    }

    // Hash password securely with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST - User Login
app.post("/login", validateAuth, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Compare hashed password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Generate JWT Token (1 hour expiry)
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET - Current User Profile (/me endpoint)
app.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
});

// ==================== PROTECTED TASK ROUTES WITH CACHING & EVENTS ====================

// GET - Read All Tasks (Practical 9: In-Memory Caching)
app.get("/tasks", authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = "all_tasks";
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      recordHit();
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cachedData);
    }

    recordMiss();
    const tasks = await Task.find();
    cache.set(cacheKey, tasks);
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET - Read Task By ID (Practical 9: Single Task Caching)
app.get("/tasks/:id", authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `task_${req.params.id}`;
    const cachedTask = cache.get(cacheKey);

    if (cachedTask) {
      recordHit();
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cachedTask);
    }

    recordMiss();
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    cache.set(cacheKey, task);
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

// POST - Create Task (Practical 9: Cache Invalidation & Practical 10: Async EventEmitter)
app.post("/tasks", authMiddleware, validateTask, async (req, res, next) => {
  try {
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority
    });

    // Invalidate Cache on Write
    cache.del("all_tasks");

    // Send HTTP Response IMMEDIATELY
    console.log(`[API] Response sent for POST /tasks at ${new Date().toISOString()}`);
    res.status(201).json(task);

    // Emit Async Background Event AFTER Response
    taskEvents.emit("task-created", task);
  } catch (err) {
    next(err);
  }
});

// UPDATE Task (Practical 9: Cache Invalidation)
app.put("/tasks/:id", authMiddleware, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Invalidate both all-tasks cache and single-task cache
    cache.del("all_tasks");
    cache.del(`task_${req.params.id}`);

    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE Task (Practical 9: Cache Invalidation & Practical 10: Async EventEmitter)
app.delete("/tasks/:id", authMiddleware, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Invalidate Cache on Write
    cache.del("all_tasks");
    cache.del(`task_${req.params.id}`);

    // Respond Immediately
    console.log(`[API] Response sent for DELETE /tasks/${req.params.id} at ${new Date().toISOString()}`);
    res.status(200).json({ message: "Task deleted successfully" });

    // Emit Async Background Event AFTER Response
    taskEvents.emit("task-deleted", { id: req.params.id, title: task.title });
  } catch (err) {
    next(err);
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// Export app for Jest testing (Practical 12)
module.exports = app;

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}