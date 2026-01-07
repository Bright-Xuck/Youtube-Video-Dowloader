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
 * GET /api/youtube/playlist-info - Get playlist information without fetching all videos
 */
exports.getPlaylistInfo = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const info = await ytService.getPlaylistInfo(url);
    res.json(info);
  } catch (err) {
    console.error("Error fetching playlist info:", err);
    res.status(500).json({ error: "Failed to fetch playlist information", details: err.message });
  }
};

/**
 * GET /api/youtube/playlist-videos - Get list of video URLs in a playlist (flat)
 */
exports.getPlaylistVideos = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const videos = await ytService.getPlaylistVideos(url);
    res.json({ videos });
  } catch (err) {
    console.error("Error fetching playlist videos:", err);
    res.status(500).json({ error: "Failed to fetch playlist videos", details: err.message });
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

  let jobId;
  try {
    jobId = uuidv4();

    // Get video info for headers and filesize estimation
    console.log(`[STREAM] Getting info for URL: ${url.substring(0, 50)}...`);
    const info = await ytService.getInfo(url);
    const videoInfo = JSON.parse(info);
    const videoTitle = videoInfo.title || "video";
    const safeFilename = videoTitle.replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);

    // Try to get estimated file size
    let estimatedFilesize = null;
    if (videoInfo.filesize) {
      estimatedFilesize = videoInfo.filesize;
    } else if (videoInfo.filesize_approx) {
      estimatedFilesize = Math.round(videoInfo.filesize_approx);
    }

    // Set response headers for download
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp4"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    
    // Set Content-Length if we have an estimated file size
    if (estimatedFilesize) {
      res.setHeader("Content-Length", estimatedFilesize);
      console.log(`[STREAM] Estimated file size: ${(estimatedFilesize / (1024 * 1024)).toFixed(2)} MB`);
    }

    console.log(`[STREAM] Starting stream for job ${jobId}`);

    // Start streaming to browser
    await ytService.streamVideoToBrowser({
      url,
      format: format || "bv*+ba/b",
      jobId,
      responseStream: res
    });

  } catch (err) {
    console.error("[STREAM] Error in streamVideo:", err);
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to start stream", details: err.message });
    } else {
      // If headers were sent, we can only destroy the response
      res.destroy();
    }
  }
};

