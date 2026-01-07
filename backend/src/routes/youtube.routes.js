const express = require("express");
const router = express.Router();
const controller = require("../controllers/youtube.controller");
const { downloadLimiter, infoLimiter, playlistLimiter, abuseDetectionMiddleware } = require("../utils/rateLimiter");

// Apply abuse detection to all routes
router.use(abuseDetectionMiddleware);

// Info and format endpoints (stricter rate limit)
router.get("/info", infoLimiter, controller.getVideoInfo);
router.get("/formats", infoLimiter, controller.getFormats);

// Browser-based streaming download
router.get("/stream", downloadLimiter, controller.streamVideo);

module.exports = router;
