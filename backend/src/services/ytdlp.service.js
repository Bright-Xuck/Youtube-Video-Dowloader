const { default: YTDlpWrap } = require("yt-dlp-wrap");
const path = require("path");
const { setProgress, clearProgress } = require("../utils/progressStore");
const { createCancellationToken, attachProcess, isCancelled } = require("../utils/cancellationService");
const { isDiskQuotaExceeded } = require("../utils/diskManager");
const fs = require("fs-extra");

const ytDlp = new YTDlpWrap();
const DOWNLOAD_DIR = path.join(__dirname, "../../downloads");

/**
 * Get video information
 */
exports.getInfo = async (url) => {
  try {
    const result = await ytDlp.getVideoInfo(url);
    return JSON.stringify(result);
  } catch (err) {
    // Provide more helpful error messages
    const errorMsg = err.message || err.toString();
    
    if (errorMsg.includes("age-restricted") || errorMsg.includes("restricted")) {
      throw new Error("Video is age-restricted. Cannot retrieve information without authentication.");
    } else if (errorMsg.includes("unavailable") || errorMsg.includes("not found")) {
      throw new Error("Video is unavailable or has been removed.");
    } else if (errorMsg.includes("Signature extraction failed")) {
      throw new Error("yt-dlp needs to be updated. Run: yt-dlp -U");
    } else {
      throw new Error(`Failed to fetch video info: ${errorMsg.substring(0, 200)}`);
    }
  }
};

/**
 * Get all available formats for a video
 */
exports.getAllFormats = async (url) => {
  try {
    const info = await ytDlp.getVideoInfo(url);
    return info.formats || [];
  } catch (err) {
    throw new Error(`Failed to fetch formats: ${err.message}`);
  }
};

/**
 * Get filtered formats (only valid, commonly used qualities)
 */
exports.getFormats = async (url) => {
  try {
    const info = await ytDlp.getVideoInfo(url);
    const formats = info.formats || [];

    // If no formats available, return presets only
    if (formats.length === 0) {
      return {
        presets: [
          { id: "best", label: "Best Quality (best video + best audio)", format: "b" },
          { id: "720p", label: "720p HD", format: "bestvideo[height<=720]+bestaudio/best[height<=720]" },
          { id: "480p", label: "480p", format: "bestvideo[height<=480]+bestaudio/best[height<=480]" },
          { id: "360p", label: "360p (Low bandwidth)", format: "bestvideo[height<=360]+bestaudio/best[height<=360]" },
          { id: "audio", label: "Audio Only (MP3)", format: "bestaudio" }
        ],
        formats: [],
        note: "No individual formats detected. Use presets above."
      };
    }

    // Filter for commonly used video formats with audio
    const filteredFormats = formats
      .filter(f => {
        // Include only formats with both video and audio
        if (!f.vcodec || f.vcodec === "none" || !f.acodec || f.acodec === "none") {
          return false;
        }
        return true;
      })
      .map(f => ({
        format_id: f.format_id,
        format: f.format,
        ext: f.ext,
        resolution: f.resolution || "unknown",
        fps: f.fps || 30,
        vcodec: f.vcodec,
        acodec: f.acodec,
        filesize: f.filesize || 0,
        filesizetitle: f._filename ? `${(f.filesize / (1024 * 1024)).toFixed(2)} MiB` : "N/A"
      }))
      .sort((a, b) => {
        // Sort by resolution descending
        const resA = parseInt(a.resolution) || 0;
        const resB = parseInt(b.resolution) || 0;
        return resB - resA;
      });

    // Also add common preset options
    const presets = [
      { id: "best", label: "Best Quality (best video + best audio)", format: "b" },
      { id: "720p", label: "720p HD", format: "bestvideo[height<=720]+bestaudio/best[height<=720]" },
      { id: "480p", label: "480p", format: "bestvideo[height<=480]+bestaudio/best[height<=480]" },
      { id: "360p", label: "360p (Low bandwidth)", format: "bestvideo[height<=360]+bestaudio/best[height<=360]" },
      { id: "audio", label: "Audio Only (MP3)", format: "bestaudio" }
    ];

    return {
      presets,
      formats: filteredFormats.slice(0, 20) // Return top 20 formats
    };
  } catch (err) {
    // Return presets even if formats fail to load
    return {
      presets: [
        { id: "best", label: "Best Quality (best video + best audio)", format: "b" },
        { id: "720p", label: "720p HD", format: "bestvideo[height<=720]+bestaudio/best[height<=720]" },
        { id: "480p", label: "480p", format: "bestvideo[height<=480]+bestaudio/best[height<=480]" },
        { id: "360p", label: "360p (Low bandwidth)", format: "bestvideo[height<=360]+bestaudio/best[height<=360]" },
        { id: "audio", label: "Audio Only (MP3)", format: "bestaudio" }
      ],
      formats: [],
      note: "Could not load specific formats. Using presets.",
      error: err.message
    };
  }
};

exports.downloadWithProgress = async ({ url, format, isPlaylist, jobId }) => {
  // Check disk quota before downloading
  const quotaExceeded = await isDiskQuotaExceeded();
  if (quotaExceeded) {
    setProgress(jobId, { error: "Disk quota exceeded", done: true });
    throw new Error("Disk quota exceeded");
  }

  // Create cancellation token
  const cancellationToken = createCancellationToken(jobId, url);

  const outputTemplate = isPlaylist
    ? `${DOWNLOAD_DIR}/%(playlist)s/%(title)s.%(ext)s`
    : `${DOWNLOAD_DIR}/%(title)s.%(ext)s`;

  const args = [
    url,
    "-f", format || "bv*+ba/b",
    "--merge-output-format", "mp4",
    "--newline",
    isPlaylist ? "--yes-playlist" : "--no-playlist",
    "-o", outputTemplate
  ];

  const process = ytDlp.exec(args);
  
  // Attach process to cancellation token
  attachProcess(jobId, process);

  process.stdout.on("data", (data) => {
    // Check if download was cancelled
    if (isCancelled(jobId)) {
      process.kill();
      return;
    }

    const line = data.toString();

    // Example: [download]  45.6% of ...
    const match = line.match(/(\d+(\.\d+)?)%/);

    if (match) {
      setProgress(jobId, {
        progress: Number(match[1]),
        raw: line.trim()
      });
    }
  });

  process.on("close", () => {
    setProgress(jobId, { progress: 100, done: true });
    setTimeout(() => clearProgress(jobId), 10000);
  });

  process.on("error", (err) => {
    setProgress(jobId, { error: err.message, done: true });
  });

  return process;
};

exports.downloadPlaylist = async ({ url, jobId }) => {
  const playlistDir = path.join(
    __dirname,
    "../../downloads",
    `playlist-${jobId}`
  );

  await fs.ensureDir(playlistDir);

  const args = [
    url,
    "-f", "bv*+ba/b",
    "--merge-output-format", "mp4",
    "--yes-playlist",
    "--newline",
    "-o", `${playlistDir}/%(title)s.%(ext)s`
  ];

  const process = ytDlp.exec(args);

  process.stdout.on("data", data => {
    const line = data.toString();
    const match = line.match(/(\d+(\.\d+)?)%/);
    if (match) {
      setProgress(jobId, { progress: Number(match[1]) });
    }
  });

  // Attach process to cancellation token
  attachProcess(jobId, process, playlistDir);

  return { process, playlistDir };
};
