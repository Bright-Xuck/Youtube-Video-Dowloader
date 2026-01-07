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
  downloadDir: '../downloads',
  outputTemplate: {
    single: '%(title)s.%(ext)s',
    playlist: '%(playlist)s/%(title)s.%(ext)s'
  },
  mergeFormat: 'mp4',
  defaultFormat: 'bv*+ba/b', // best video + best audio / best overall

  // Video format presets
  formatPresets: [
    { id: 'best', label: 'Best Quality (best video + best audio)', format: 'bv*+ba/b' },
    { id: '720p', label: '720p HD', format: 'bestvideo[height<=720]+bestaudio/best[height<=720]' },
    { id: '480p', label: '480p', format: 'bestvideo[height<=480]+bestaudio/best[height<=480]' },
    { id: '360p', label: '360p (Low bandwidth)', format: 'bestvideo[height<=360]+bestaudio/best[height<=360]' },
    { id: 'audio', label: 'Audio Only (MP3)', format: 'bestaudio' }
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
