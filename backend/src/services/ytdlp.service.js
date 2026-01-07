const { default: YTDlpWrap } = require("yt-dlp-wrap");
const { spawn } = require("child_process");
const { setProgress, clearProgress } = require("../utils/progressStore");
const { createCancellationToken, attachProcess, isCancelled } = require("../utils/cancellationService");

const ytDlp = new YTDlpWrap();

/**
 * Get playlist information without fetching all video details
 */
exports.getPlaylistInfo = async (url) => {
  try {
    const isPlaylist = url.includes('list=');
    if (!isPlaylist) {
      throw new Error('This is not a playlist URL');
    }

    // Use yt-dlp to get just the playlist metadata
    // We extract title, uploader, and count using a simple approach
    const info = await ytDlp.getVideoInfo(url);
    
    return {
      title: info.title || 'Playlist',
      uploader: info.uploader || 'Unknown',
      description: info.description || '',
      thumbnail: info.thumbnail || null,
      playlist_count: info.playlist_count || 0,
      webpage_url: info.webpage_url || url
    };
  } catch (err) {
    const errorMsg = err.message || err.toString();
    
    if (errorMsg.includes("age-restricted") || errorMsg.includes("restricted")) {
      throw new Error("Playlist is age-restricted. Cannot retrieve information without authentication.");
    } else if (errorMsg.includes("unavailable") || errorMsg.includes("not found")) {
      throw new Error("Playlist is unavailable or has been removed.");
    } else if (errorMsg.includes("This is not a playlist")) {
      throw new Error(errorMsg);
    } else {
      throw new Error(`Failed to fetch playlist info: ${errorMsg.substring(0, 200)}`);
    }
  }
};

/**
 * Get flat list of videos in a playlist without fetching all video metadata
 */
exports.getPlaylistVideos = async (url) => {
  try {
    const isPlaylist = url.includes('list=');
    if (!isPlaylist) throw new Error('This is not a playlist URL');

    // Try using yt-dlp to return a flat JSON playlist (-J --flat-playlist)
    const args = ['-J', '--flat-playlist', url];
    const child = require('child_process').spawn(process.env.YTDLP_PATH || 'yt-dlp', args, { shell: false });

    let out = '';
    for await (const chunk of child.stdout) {
      out += chunk.toString();
    }

    // Wait for process to finish
    const code = await new Promise((resolve) => child.on('close', resolve));
    if (code !== 0) {
      throw new Error('yt-dlp failed to list playlist entries');
    }

    const parsed = JSON.parse(out);
    const entries = parsed.entries || [];
    const videos = entries.map(e => ({
      id: e.id,
      title: e.title || e.id,
      url: e.webpage_url || (e.id ? `https://youtu.be/${e.id}` : null)
    })).filter(v => v.url);

    return videos;
  } catch (err) {
    // Fallback: try getVideoInfo and parse entries if available
    try {
      const info = await ytDlp.getVideoInfo(url);
      const entries = info.entries || [];
      const videos = entries.map(e => ({ id: e.id, title: e.title, url: e.webpage_url })).filter(v => v.url);
      return videos;
    } catch (err2) {
      throw new Error(`Failed to fetch playlist videos: ${err.message}; fallback: ${err2.message}`);
    }
  }
};

/**
 * Get video information
 */
exports.getInfo = async (url) => {
  try {
    // For playlists, only get info about the playlist itself, not all videos
    const isPlaylist = url.includes('list=');
    
    const options = {
      timeout: isPlaylist ? 30000 : 15000  // Longer timeout for playlists
    };

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
    } else if (errorMsg.includes("timeout") || errorMsg.includes("ETIMEDOUT")) {
      throw new Error("Request timed out. The video/playlist may be too large or there's a network issue.");
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

/**
 * Stream video directly to browser (no disk storage)
 */
exports.streamVideoToBrowser = async ({ url, format, jobId, responseStream }) => {
  try {
    // Create cancellation token
    const cancellationToken = createCancellationToken(jobId, url);

    const args = [
      url,
      "-f", format || "bv*+ba/b",
      "--merge-output-format", "mp4",
      "-o", "-", // Stream to stdout
      "--quiet",
      "--no-warnings"
    ];

    console.log(`[YTDLP] Starting download for job ${jobId} with format: ${format}`);
    
    // Use spawn to create the yt-dlp process directly
    const ytDlpCmd = process.env.YTDLP_PATH || 'yt-dlp';
    const childProcess = spawn(ytDlpCmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });

    if (!childProcess) {
      throw new Error('Failed to create yt-dlp process');
    }

    attachProcess(jobId, childProcess);

    let totalSize = 0;
    let downloadedSize = 0;
    let lastProgressUpdate = 0;
    let hasError = false;
    let isCompleted = false;

    // Track progress from stdout data (video stream)
    childProcess.stdout.on("data", (chunk) => {
      if (hasError || isCompleted) return;
      
      if (isCancelled(jobId)) {
        console.log(`[YTDLP] Job ${jobId} was cancelled`);
        hasError = true;
        try {
          childProcess.kill();
        } catch (e) {
          // Ignore
        }
        responseStream.destroy();
        return;
      }

      downloadedSize += chunk.length;
      
      try {
        const written = responseStream.write(chunk);
        
        if (!written) {
          // Backpressure - pause the stream temporarily
          childProcess.stdout.pause();
          responseStream.once('drain', () => {
            childProcess.stdout.resume();
          });
        }
      } catch (err) {
        console.error(`[YTDLP] Error writing to response for job ${jobId}:`, err.message);
        hasError = true;
        try {
          childProcess.kill();
        } catch (e) {
          // Ignore
        }
        return;
      }

      // Update progress every 500ms
      const now = Date.now();
      if (now - lastProgressUpdate > 500) {
        setProgress(jobId, {
          progress: totalSize > 0 ? Math.min((downloadedSize / totalSize) * 100, 99) : 50,
          downloaded: downloadedSize,
          total: totalSize || downloadedSize * 2, // Estimate if unknown
          raw: `Streaming: ${(downloadedSize / (1024 * 1024)).toFixed(2)} MB`
        });
        lastProgressUpdate = now;
      }
    });

    // Parse stderr for progress and diagnostics
    childProcess.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (line) {
        console.log(`[YTDLP-stderr] ${jobId}: ${line.substring(0, 150)}`);
      }
    });

    childProcess.on("close", (code) => {
      console.log(`[YTDLP] Process closed for job ${jobId} with code ${code}`);
      
      if (!hasError && !isCompleted) {
        isCompleted = true;
        
        if (code === 0 || code === null) {
          // Success
          responseStream.end();
          setProgress(jobId, { 
            progress: 100, 
            downloaded: downloadedSize,
            total: downloadedSize,
            done: true 
          });
          console.log(`[YTDLP] Download completed successfully for job ${jobId}, total: ${(downloadedSize / (1024 * 1024)).toFixed(2)} MB`);
        } else if (code === 143 || code === 15) {
          // SIGTERM/SIGKILL - cancelled
          console.log(`[YTDLP] Download cancelled for job ${jobId}`);
          responseStream.destroy();
        } else {
          // Error
          console.error(`[YTDLP] Process exited with code ${code} for job ${jobId}`);
          responseStream.destroy();
          setProgress(jobId, { error: `Download failed with exit code ${code}`, done: true });
        }
      }
      
      setTimeout(() => clearProgress(jobId), 10000);
    });

    childProcess.on("error", (err) => {
      console.error(`[YTDLP] Process error for job ${jobId}:`, err && err.message ? err.message : err);
      if (!hasError) {
        hasError = true;
        responseStream.destroy();
        const message = (err && err.code === 'ENOENT')
          ? 'yt-dlp executable not found. Install yt-dlp and ensure it is on PATH or set YTDLP_PATH.'
          : (err && err.message) || 'Unknown process error';
        setProgress(jobId, { error: message, done: true });
      }
    });

    return { childProcess };
  } catch (err) {
    console.error(`[YTDLP] Error in streamVideoToBrowser for job ${jobId}:`, err.message);
    setProgress(jobId, { error: err.message, done: true });
    throw err;
  }
};

