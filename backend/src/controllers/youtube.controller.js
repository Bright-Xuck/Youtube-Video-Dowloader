const ytService = require("../services/ytdlp.service");
const { isValidYouTubeUrl } = require("../utils/validator");
const { v4: uuidv4 } = require("uuid");


/**
 * GET /api/youtube/info - Get video information
 */
exports.getVideoInfo = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const info = await ytService.getInfo(url);
    res.json(JSON.parse(info));
  } catch (err) {
    console.error("Error fetching video info:", err);
    res.status(500).json({ error: "Failed to fetch video information", details: err.message });
  }
};

/**
 * GET /api/youtube/formats - Get available video formats (filtered)
 */
exports.getFormats = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const formats = await ytService.getFormats(url);
    res.json(formats);
  } catch (err) {
    console.error("Error fetching formats:", err);
    res.status(500).json({ error: "Failed to fetch formats", details: err.message });
  }
};

/**
 * GET /api/youtube/stream - Stream video directly to browser (browser-based download)
 */
exports.streamVideo = async (req, res) => {
  const { url, format } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const jobId = uuidv4();

    // Get video info for headers
    const info = await ytService.getInfo(url);
    const videoInfo = JSON.parse(info);
    const videoTitle = videoInfo.title || "video";
    const safeFilename = videoTitle.replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);

    // Set response headers for download
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp4"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Start streaming to browser
    ytService.streamVideoToBrowser({
      url,
      format: format || "bv*+ba/b",
      jobId,
      responseStream: res
    }).catch(err => {
      console.error(`Stream error for job ${jobId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream failed", details: err.message });
      }
    });

  } catch (err) {
    console.error("Error starting stream:", err);
    res.status(500).json({ error: "Failed to start stream", details: err.message });
  }
};

