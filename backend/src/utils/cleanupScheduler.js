const cron = require("node-cron");
const diskManager = require("./diskManager");

let schedulerActive = false;

/**
 * Start the cleanup scheduler that runs every hour
 */
exports.startCleanupScheduler = () => {
  if (schedulerActive) {
    console.log("[SCHEDULER] Cleanup scheduler already running");
    return;
  }

  try {
    // Run cleanup every hour (0 * * * * = every hour at minute 0)
    cron.schedule("0 * * * *", async () => {
      try {
        console.log("[SCHEDULER] Running automatic cleanup...");
        const stats = await diskManager.getDiskStats();
        
        if (stats.percentUsed > 80) {
          console.log(`[SCHEDULER] Disk usage at ${stats.percentUsed}%, triggering cleanup...`);
          const result = await diskManager.cleanupOldFiles(500); // Free 500MB
          console.log("[SCHEDULER] Cleanup completed:", result);
        }
      } catch (err) {
        console.error("[SCHEDULER] Error in hourly cleanup:", err.message);
      }
    });

    // Check every 5 minutes if quota is exceeded
    cron.schedule("*/5 * * * *", async () => {
      try {
        const exceeded = await diskManager.isDiskQuotaExceeded();
        if (exceeded) {
          console.log("[SCHEDULER] Quota exceeded, triggering aggressive cleanup...");
          await diskManager.cleanupOldFiles(1000); // Free 1GB
        }
      } catch (err) {
        console.error("[SCHEDULER] Error in quota check:", err.message);
      }
    });

    schedulerActive = true;
    console.log("[SCHEDULER] ✅ Cleanup scheduler started");
  } catch (err) {
    console.error("[SCHEDULER] Failed to start cleanup scheduler:", err.message);
    throw err;
  }
};

/**
 * Stop the cleanup scheduler
 */
exports.stopCleanupScheduler = () => {
  schedulerActive = false;
  console.log("[SCHEDULER] Cleanup scheduler stopped");
};

/**
 * Manually trigger cleanup
 */
exports.manualCleanup = async (targetFreeMB = 500) => {
  return await diskManager.cleanupOldFiles(targetFreeMB);
};
