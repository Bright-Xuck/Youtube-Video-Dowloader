/**
 * Download cancellation service
 * Manages cancellation tokens and process cleanup
 */

const activeDownloads = new Map();

/**
 * Create a cancellation token for a download
 */
exports.createCancellationToken = (jobId, url) => {
  const token = {
    id: jobId,
    url: url,
    cancelled: false,
    process: null,
    playlistDir: null,
    createdAt: Date.now()
  };

  activeDownloads.set(jobId, token);
  return token;
};

/**
 * Get cancellation token
 */
exports.getCancellationToken = (jobId) => {
  return activeDownloads.get(jobId);
};

/**
 * Cancel a download
 */
exports.cancelDownload = async (jobId) => {
  const token = activeDownloads.get(jobId);

  if (!token) {
    return { success: false, error: "Download not found" };
  }

  if (token.cancelled) {
    return { success: false, error: "Download already cancelled" };
  }

  try {
    token.cancelled = true;

    // Kill the process if it exists
    if (token.process && token.process.pid) {
      process.kill(token.process.pid);
    }

    // Clean up the directory if it exists
    if (token.playlistDir) {
      const fs = require("fs-extra");
      await fs.remove(token.playlistDir);
    }

    // Schedule cleanup of the token after 5 seconds
    setTimeout(() => {
      activeDownloads.delete(jobId);
    }, 5000);

    return { success: true, message: "Download cancelled" };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Check if a download is cancelled
 */
exports.isCancelled = (jobId) => {
  const token = activeDownloads.get(jobId);
  return token ? token.cancelled : false;
};

/**
 * Attach process to cancellation token
 */
exports.attachProcess = (jobId, process, playlistDir = null) => {
  const token = activeDownloads.get(jobId);
  if (token) {
    token.process = process;
    if (playlistDir) {
      token.playlistDir = playlistDir;
    }
  }
};

/**
 * Get all active downloads
 */
exports.getActiveDownloads = () => {
  const downloads = [];
  for (const [jobId, token] of activeDownloads) {
    downloads.push({
      jobId,
      url: token.url,
      cancelled: token.cancelled,
      createdAt: token.createdAt,
      elapsed: Date.now() - token.createdAt
    });
  }
  return downloads;
};

/**
 * Clean up old tokens (older than 1 hour)
 */
exports.cleanupOldTokens = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const [jobId, token] of activeDownloads) {
    if (token.createdAt < oneHourAgo) {
      activeDownloads.delete(jobId);
    }
  }
};
