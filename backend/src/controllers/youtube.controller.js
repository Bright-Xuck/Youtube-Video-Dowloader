const ytService = require("../services/ytdlp.service");
const diskManager = require("../utils/diskManager");
const { getActiveDownloads } = require("../utils/cancellationService");
const {
  isValidYouTubeUrl,
  isPlaylistUrl,
  isValidFormatSelector,
  isValidJobId,
  toSafeFilename
} = require("../utils/validator");
const { defaultFormat } = require("../config");
const { v4: uuidv4 } = require("uuid");

const CONTENT_TYPES = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  m4a: "audio/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  flv: "video/x-flv",
  ts: "video/mp2t",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav"
};

const contentTypeFor = (ext) =>
  CONTENT_TYPES[String(ext || "mp4").toLowerCase()] || "application/octet-stream";

/** Content-Disposition that survives non-ASCII titles (RFC 6266). */
const contentDispositionFor = (filename) => {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

/**
 * Send a file from the scratch directory.
 *
 * Notes:
 *  - the scratch directory is named ".tmp", so Express needs dotfiles: "allow";
 *  - a callback is always given, otherwise a failure would leave the request
 *    hanging with no response at all;
 *  - byte ranges (resume, 206) are handled by Express/send itself, so nothing
 *    here may set Content-Length or Content-Range.
 */
const sendFileResponse = (res, { filePath, size, ext }, rangeHeader, label, downloadName) => {
  const headers = {
    "Content-Type": contentTypeFor(ext),
    "Accept-Ranges": "bytes"
  };
  if (downloadName) {
    headers["Content-Disposition"] = contentDispositionFor(downloadName);
  }

  console.log(
    `[STREAM] Sending ${(size / (1024 * 1024)).toFixed(2)} MB (${label})${
      rangeHeader ? ` with range "${rangeHeader}"` : ""
    }`
  );

  res.sendFile(
    filePath,
    { dotfiles: "allow", headers, cacheControl: false, lastModified: false },
    (err) => {
      if (!err) return;
      console.error(`[STREAM] Error sending file (${label}): ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed", details: err.message });
      } else if (!res.writableEnded) {
        res.destroy();
      }
    }
  );
};


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
 * GET /api/youtube/stream - download a video to the browser
 *
 * Two paths, picked by what yt-dlp resolves the request to:
 *  - a single already-muxed stream is piped straight through;
 *  - a video+audio combination is merged by ffmpeg into a scratch file first and
 *    then served with res.sendFile() (exact Content-Length, Range/resume).
 */
exports.streamVideo = async (req, res) => {
  const { url, format, jobId: requestedJobId } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  if (isPlaylistUrl(url)) {
    return res.status(400).json({
      error: "Playlist links cannot be streamed as a single file",
      details: "Open a single video and download it instead."
    });
  }

  if (format && !isValidFormatSelector(format)) {
    return res.status(400).json({ error: "Invalid format selector" });
  }

  const formatSelector = (format || defaultFormat).trim();
  const jobId = isValidJobId(requestedJobId) ? requestedJobId : uuidv4();

  // If the browser walks away (cancel, refresh, closed tab) stop yt-dlp too.
  // The scratch file is kept so a paused download can be resumed.
  let clientGone = false;
  res.on("close", () => {
    if (!res.writableFinished && !clientGone) {
      clientGone = true;
      console.log(`[STREAM] Client left, stopping job ${jobId}`);
      ytService.abortJob(jobId).catch(() => {});
    }
  });

  try {
    // Resume support: a merged file from an earlier request for this job can
    // be served again, including a byte range.
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const existing = await ytService.findCompletedJob(jobId);
      if (existing) {
        sendFileResponse(res, existing, rangeHeader, `resuming job ${jobId}`);
        return;
      }
    }

    const selection = await ytService.resolveSelection(url, formatSelector);
    if (clientGone) return;

    const baseName = toSafeFilename(selection.title, "video");
    console.log(
      `[STREAM] Job ${jobId}: "${selection.title}" -> ${selection.formatId} ` +
        `(${selection.needsMerge ? "merge to file" : "direct stream"})`
    );

    if (selection.needsMerge) {
      const merged = await ytService.downloadToFile({
        url,
        format: formatSelector,
        jobId
      });
      const { filePath, size, ext } = merged;

      if (clientGone) {
        await ytService.cleanupJob(jobId);
        return;
      }

      console.log(`[STREAM] Job ${jobId} ready, sending ${(size / (1024 * 1024)).toFixed(2)} MB`);
      sendFileResponse(
        res,
        { filePath, size, ext },
        rangeHeader,
        `job ${jobId}`,
        `${baseName}.${ext}`
      );
      return;
    }

    // Only a plain https stream has a byte count that is guaranteed to match
    // the body. Anything else is sent chunked, because a wrong Content-Length
    // makes the browser abort the download with a network error.
    const exactSize = selection.protocol === "https" ? selection.filesize : 0;

    await ytService.startStream({
      url,
      format: formatSelector,
      jobId,
      responseStream: res,
      onFirstWrite: () => {
        res.setHeader("Content-Type", contentTypeFor(selection.ext));
        res.setHeader("Content-Disposition", contentDispositionFor(`${baseName}.${selection.ext}`));
        if (exactSize > 0) {
          res.setHeader("Content-Length", exactSize);
        }
      }
    });
  } catch (err) {
    console.error(`[STREAM] Job ${jobId} failed:`, err.message);

    if (!res.headersSent) {
      // Nothing was sent yet, so the browser gets a real error message
      // instead of a dead connection ("Failed to fetch").
      res.status(500).json({ error: "Download failed", details: err.message });
    } else if (!res.writableEnded) {
      res.destroy();
    }

    // A finished merge is kept for a while (Range/resume), but a failure never
    // leaves anything behind.
    if (res.statusCode === 500) {
      await ytService.cleanupJob(jobId);
    }
  }
};

/**
 * GET /api/youtube/downloads - jobs currently running
 */
exports.getActiveDownloads = (req, res) => {
  res.json({ downloads: getActiveDownloads() });
};

/**
 * POST /api/youtube/cancel/:jobId - cancel a running job
 */
exports.cancelDownloadJob = async (req, res) => {
  const result = await ytService.cancelJob(req.params.jobId);
  res.status(result.success ? 200 : 404).json(result);
};

/**
 * GET /api/youtube/disk-stats - space used by the backend
 */
exports.getDiskStats = async (req, res) => {
  try {
    res.json(await diskManager.getDiskStats());
  } catch (err) {
    res.status(500).json({ error: "Could not read disk stats", details: err.message });
  }
};

