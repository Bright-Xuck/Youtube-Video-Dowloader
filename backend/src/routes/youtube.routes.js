const express = require("express");
const router = express.Router();
const controller = require("../controllers/youtube.controller");
const { downloadLimiter, infoLimiter, playlistLimiter, abuseDetectionMiddleware } = require("../utils/rateLimiter");

// Apply abuse detection to all routes
router.use(abuseDetectionMiddleware);

// Info and format endpoints (stricter rate limit)
router.get("/info", infoLimiter, controller.getVideoInfo);
router.get("/formats", infoLimiter, controller.getFormats);

// Download endpoints
router.get("/download", downloadLimiter, controller.startDownload);
router.get("/progress/:jobId", controller.streamProgress);
router.post("/cancel/:jobId", controller.cancelDownloadJob);
router.get("/downloads", controller.getActiveDownloads);

// Disk management
router.get("/disk-stats", controller.getDiskUsage);

// Playlist endpoints
router.get("/playlist/zip", playlistLimiter, controller.downloadPlaylistZip);

module.exports = router;
