const express = require("express");
const router = express.Router();
const controller = require("../controllers/youtube.controller");
const { getProgress } = require("../utils/progressStore");
const { downloadLimiter, infoLimiter, playlistLimiter, abuseDetectionMiddleware } = require("../utils/rateLimiter");

// Apply abuse detection to all routes
router.use(abuseDetectionMiddleware);

// Info and format endpoints (stricter rate limit)
router.get("/info", infoLimiter, controller.getVideoInfo);
router.get("/playlist-info", playlistLimiter, controller.getPlaylistInfo);
router.get("/formats", infoLimiter, controller.getFormats);

// Browser-based download
router.get("/stream", downloadLimiter, controller.streamVideo);

// Live progress for a running job (server sent events)
router.get("/progress/:jobId", (req, res) => {
  const { jobId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.flushHeaders?.();

  let lastPayload = "";
  const push = () => {
    const data = getProgress(jobId);
    if (!data || res.writableEnded) return;

    const payload = JSON.stringify(data);
    if (payload === lastPayload) return;
    lastPayload = payload;
    res.write(`data: ${payload}\n\n`);
  };

  push();
  const interval = setInterval(push, 1000);

  // Do not keep the connection open forever
  const maxLifetime = setTimeout(() => {
    clearInterval(interval);
    res.end();
  }, 60 * 60 * 1000);
  maxLifetime.unref?.();

  req.on("close", () => {
    clearInterval(interval);
    clearTimeout(maxLifetime);
  });
});

// Job management
router.get("/downloads", controller.getActiveDownloads);
router.post("/cancel/:jobId", controller.cancelDownloadJob);
router.get("/disk-stats", controller.getDiskStats);

module.exports = router;
