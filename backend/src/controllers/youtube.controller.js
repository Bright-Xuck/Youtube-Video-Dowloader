const ytService = require("../services/ytdlp.service");
const { isValidYouTubeUrl } = require("../utils/validator");
const { v4: uuidv4 } = require("uuid");
const { getProgress } = require("../utils/progressStore");
const { cancelDownload, getActiveDownloads, cleanupOldTokens } = require("../utils/cancellationService");
const { getDiskStats } = require("../utils/diskManager");
const path = require("path");
const fs = require("fs-extra");
const { zipDirectory } = require("../utils/zipper");


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
 * GET /api/youtube/download - Start a download
 */
exports.startDownload = async (req, res) => {
  const { url, format, playlist } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const jobId = uuidv4();

    // Start download in background
    ytService.downloadWithProgress({
      url,
      format: format || "bv*+ba/b",
      isPlaylist: playlist === "true",
      jobId
    }).catch(err => {
      console.error(`Download error for job ${jobId}:`, err);
    });

    res.json({ 
      jobId,
      message: "Download started",
      progressUrl: `/api/youtube/progress/${jobId}`
    });
  } catch (err) {
    console.error("Error starting download:", err);
    res.status(500).json({ error: "Failed to start download", details: err.message });
  }
};

/**
 * GET /api/youtube/progress/:jobId - Stream progress as Server-Sent Events (SSE)
 */
exports.streamProgress = (req, res) => {
  const { jobId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const interval = setInterval(() => {
    const progress = getProgress(jobId);

    if (progress) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);

      if (progress.done || progress.error) {
        clearInterval(interval);
        setTimeout(() => res.end(), 1000);
      }
    }
  }, 500);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
};

/**
 * POST /api/youtube/cancel/:jobId - Cancel a download
 */
exports.cancelDownloadJob = async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ error: "Job ID is required" });
  }

  try {
    const result = await cancelDownload(jobId);
    
    if (result.success) {
      res.json({ message: "Download cancelled successfully" });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (err) {
    console.error("Error cancelling download:", err);
    res.status(500).json({ error: "Failed to cancel download" });
  }
};

/**
 * GET /api/youtube/downloads - Get active downloads
 */
exports.getActiveDownloads = (req, res) => {
  try {
    cleanupOldTokens();
    const downloads = getActiveDownloads();
    res.json({ downloads, count: downloads.length });
  } catch (err) {
    console.error("Error getting active downloads:", err);
    res.status(500).json({ error: "Failed to get active downloads" });
  }
};

/**
 * GET /api/youtube/disk-stats - Get disk usage statistics
 */
exports.getDiskUsage = async (req, res) => {
  try {
    const stats = await getDiskStats();
    res.json(stats);
  } catch (err) {
    console.error("Error getting disk stats:", err);
    res.status(500).json({ error: "Failed to get disk statistics" });
  }
};

/**
 * GET /api/youtube/playlist/zip - Download entire playlist as ZIP
 */
exports.downloadPlaylistZip = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Playlist URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const jobId = uuidv4();
  const zipPath = path.join(
    __dirname,
    "../../downloads",
    `playlist-${jobId}.zip`
  );

  try {
    const { process, playlistDir } =
      await ytService.downloadPlaylist({ url, jobId });

    process.on("close", async () => {
      try {
        await zipDirectory(playlistDir, zipPath);

        res.download(zipPath, `playlist-${jobId}.zip`, (err) => {
          // Clean up files after download
          fs.removeSync(playlistDir);
          fs.removeSync(zipPath);
          if (err) console.error("Error sending zip:", err);
        });
      } catch (err) {
        console.error("Error creating zip:", err);
        res.status(500).json({ error: "Failed to create ZIP file" });
        fs.removeSync(playlistDir);
      }
    });

    process.on("error", (err) => {
      console.error("Download error:", err);
      fs.removeSync(playlistDir);
      res.status(500).json({ error: "Playlist download failed" });
    });

  } catch (err) {
    console.error("Error starting playlist download:", err);
    res.status(500).json({ error: "Failed to start playlist download", details: err.message });
  }
};