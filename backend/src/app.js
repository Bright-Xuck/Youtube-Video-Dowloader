const express = require("express");
const cors = require("cors");
const youtubeRoutes = require("./routes/youtube.routes");
const { generalLimiter } = require("./utils/rateLimiter");
const { startCleanupScheduler } = require("./utils/cleanupScheduler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Apply general rate limiting
app.use(generalLimiter);

// Routes
app.use("/api/youtube", youtubeRoutes);

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start cleanup scheduler on app startup (with error handling)
try {
  startCleanupScheduler();
} catch (err) {
  console.warn("[SCHEDULER] Warning: Failed to start cleanup scheduler:", err.message);
  // Continue even if scheduler fails - it's not critical
}

module.exports = app;
