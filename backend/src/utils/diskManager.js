const fs = require("fs-extra");
const path = require("path");

const DOWNLOAD_DIR = path.join(__dirname, "../../downloads");
const MAX_DISK_SPACE_MB = process.env.MAX_DISK_SPACE_MB || 5000; // 5GB default

/**
 * Get total size of a directory in bytes
 */
const getDirSize = async (dir) => {
  let size = 0;
  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      size += await getDirSize(filePath);
    } else {
      size += (await fs.stat(filePath)).size;
    }
  }

  return size;
};

/**
 * Get current disk usage in MB
 */
exports.getCurrentDiskUsage = async () => {
  try {
    await fs.ensureDir(DOWNLOAD_DIR);
    const sizeBytes = await getDirSize(DOWNLOAD_DIR);
    return sizeBytes / (1024 * 1024); // Convert to MB
  } catch (err) {
    console.error("Error calculating disk usage:", err);
    return 0;
  }
};

/**
 * Check if disk quota is exceeded
 */
exports.isDiskQuotaExceeded = async () => {
  const currentUsage = await exports.getCurrentDiskUsage();
  return currentUsage >= MAX_DISK_SPACE_MB;
};

/**
 * Get available disk space in MB
 */
exports.getAvailableDiskSpace = async () => {
  const currentUsage = await exports.getCurrentDiskUsage();
  return Math.max(0, MAX_DISK_SPACE_MB - currentUsage);
};

/**
 * Clean up old files to free up disk space
 */
exports.cleanupOldFiles = async (targetFreeMB = 500) => {
  try {
    await fs.ensureDir(DOWNLOAD_DIR);
    const files = await fs.readdir(DOWNLOAD_DIR, { withFileTypes: true });
    
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(DOWNLOAD_DIR, file.name);
        const stat = await fs.stat(filePath);
        return {
          name: file.name,
          path: filePath,
          mtime: stat.mtimeMs,
          isDir: file.isDirectory(),
          size: stat.size
        };
      })
    );

    // Sort by modification time (oldest first)
    fileStats.sort((a, b) => a.mtime - b.mtime);

    let freedSpace = 0;
    for (const file of fileStats) {
      if (freedSpace >= targetFreeMB * 1024 * 1024) break;

      try {
        await fs.remove(file.path);
        freedSpace += file.size;
        console.log(`[CLEANUP] Removed: ${file.name}`);
      } catch (err) {
        console.error(`Failed to remove ${file.name}:`, err);
      }
    }

    return {
      success: true,
      freedSpaceMB: freedSpace / (1024 * 1024)
    };
  } catch (err) {
    console.error("Cleanup failed:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Get disk usage statistics
 */
exports.getDiskStats = async () => {
  const currentUsage = await exports.getCurrentDiskUsage();
  const available = await exports.getAvailableDiskSpace();
  const quota = MAX_DISK_SPACE_MB;

  return {
    used: Math.round(currentUsage * 100) / 100,
    available: Math.round(available * 100) / 100,
    quota,
    percentUsed: Math.round((currentUsage / quota) * 100)
  };
};
