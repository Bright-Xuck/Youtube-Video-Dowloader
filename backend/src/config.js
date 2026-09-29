const path = require("path");

const BACKEND_ROOT = path.join(__dirname, "..");
const DOWNLOAD_DIR = path.join(BACKEND_ROOT, "downloads");

/**
 * Configuration file for backend settings
 */

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Disk management
  maxDiskSpaceMB: process.env.MAX_DISK_SPACE_MB || 5000,
  cleanupThresholdPercent: 80,
  aggressiveCleanupThresholdPercent: 95,

  // Rate limiting (all times in milliseconds)
  rateLimits: {
    general: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 30
    },
    download: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10
    },
    playlist: {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 5
    },
    info: {
      windowMs: 60 * 1000, // 1 minute
      max: 20
    }
  },

  // Download configuration
  downloadDir: DOWNLOAD_DIR,
  // Scratch space for downloads that must be merged by ffmpeg before they can
  // be streamed. Files are removed as soon as they are handed to the browser.
  tmpDir: path.join(DOWNLOAD_DIR, '.tmp'),
  fragmentDir: path.join(DOWNLOAD_DIR, '.tmp', 'fragments'),
  outputTemplate: {
    single: '%(title)s.%(ext)s',
    playlist: '%(playlist)s/%(title)s.%(ext)s'
  },
  mergeFormat: 'mp4',
  // "bv*+ba" = best video + best audio. A bare "b" MUST NOT be used: it selects
  // YouTube's progressive formats (18/22), which now answer with HTTP 403.
  defaultFormat: 'bv*+ba',
  // Prefer H.264 video + AAC audio so the merged result is a normal, widely
  // playable MP4 (VP9/AV1 + Opus in MP4 is not universally supported).
  sortOrder: process.env.YTDLP_SORT || 'vcodec:h264,res,aext:m4a',
  // yt-dlp needs a JS runtime to solve YouTube's player challenges.
  // Use "deno" if you install it, "node" works with Node 20+.
  jsRuntime: process.env.YTDLP_JS_RUNTIME || 'node',
  // How long we wait for the first byte of a direct stream before giving up.
  streamStartupTimeoutMs: Number(process.env.STREAM_STARTUP_TIMEOUT_MS) || 60000,
  // A finished merge is kept this long so a paused download can be resumed
  // with an HTTP Range request.
  tempFileTtlMs: Number(process.env.TEMP_FILE_TTL_MS) || 10 * 60 * 1000,

  // Video format presets
  formatPresets: [
    { id: 'best', label: 'Best Quality (best video + best audio)', format: 'bv*+ba' },
    { id: '720p', label: '720p HD', format: 'bv*[height<=720]+ba' },
    { id: '480p', label: '480p', format: 'bv*[height<=480]+ba' },
    { id: '360p', label: '360p (Low bandwidth)', format: 'bv*[height<=360]+ba' },
    { id: 'audio', label: 'Audio Only', format: 'ba' }
  ],

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Cleanup scheduler
  scheduler: {
    checkInterval: '0 * * * *', // Every hour
    frequentCheckInterval: '*/5 * * * *', // Every 5 minutes
    tokenCleanupAfterMs: 60 * 60 * 1000, // 1 hour
    defaultFreeMB: 500
  }
};
