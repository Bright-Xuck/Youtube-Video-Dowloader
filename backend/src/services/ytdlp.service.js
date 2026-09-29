const { default: YTDlpWrap } = require("yt-dlp-wrap");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const { setProgress, clearProgress } = require("../utils/progressStore");
const { createCancellationToken, attachProcess, isCancelled, getCancellationToken, removeToken } = require("../utils/cancellationService");
const {
  defaultFormat,
  formatPresets,
  fragmentDir,
  jsRuntime,
  sortOrder,
  streamStartupTimeoutMs,
  tempFileTtlMs,
  tmpDir
} = require("../config");

const YTDLP_BINARY = process.env.YTDLP_BINARY || "yt-dlp";
const ytDlp = new YTDlpWrap(YTDLP_BINARY);

const isYtDlpNotFoundError = (err) => {
  const errorMsg = err && (err.message || err.toString());
  return err && (err.code === "ENOENT" || (typeof errorMsg === "string" && errorMsg.includes("spawn") && errorMsg.includes("ENOENT")));
};

const ytdlpMissingMessage = "yt-dlp binary not found. Install yt-dlp or set YTDLP_BINARY to the full executable path.";

// ---------------------------------------------------------------------------
// yt-dlp plumbing
// ---------------------------------------------------------------------------

/** Flags applied to every yt-dlp invocation. */
const baseArgs = () => {
  const args = ["--no-warnings", "--no-color"];
  if (jsRuntime) {
    // YouTube needs a JS runtime to solve its player challenges. Without one,
    // formats go missing and media requests get rejected (HTTP 403).
    args.push("--js-runtimes", jsRuntime);
  }
  return args;
};

/** Format selection shared by the direct-stream and merge-download paths. */
const selectionArgs = (format) => ["-S", sortOrder, "-f", format || defaultFormat];

/** Machine readable progress lines written to stderr. */
const PROGRESS_TEMPLATE =
  "PROG|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s";

/** One line describing the format yt-dlp would pick for a selector. */
const SELECTION_TEMPLATE = [
  "%(title)s",
  "%(format_id)s",
  "%(ext)s",
  "%(protocol)s",
  "%(vcodec)s",
  "%(acodec)s",
  "%(filesize)s",
  "%(filesize_approx)s",
  "%(height)s"
].join("\t");

const toNumber = (value) => (value && value !== "NA" ? Number(value) || 0 : 0);

const parseProgressLine = (line) => {
  if (!line.startsWith("PROG|")) return null;

  const parts = line.split("|");
  const downloaded = toNumber(parts[1]);
  const total = toNumber(parts[2]) || toNumber(parts[3]);
  if (!downloaded && !total) return null;

  return {
    downloaded,
    total,
    speed: toNumber(parts[4]),
    eta: parts[5] && parts[5] !== "NA" ? parts[5] : null,
    progress: total > 0 ? Math.min(99, (downloaded / total) * 100) : 0
  };
};

/**
 * Spawn yt-dlp and expose its output line by line.
 *
 * yt-dlp prints status messages and progress lines to STDOUT and errors to
 * STDERR - unless it is writing the media itself to stdout ("-o -"), in which
 * case everything textual moves to STDERR. Callers pick the stream they parse.
 */
const spawnYtdlp = (args, { onStdoutLine, onStderrLine } = {}) => {
  const child = spawn(YTDLP_BINARY, args, { stdio: ["ignore", "pipe", "pipe"], shell: false });
  const stdoutLines = [];
  const stderrLines = [];

  const attach = (stream, lines, onLine) => {
    if (!stream) return;
    let pending = "";

    stream.on("data", (chunk) => {
      pending += chunk.toString();
      const parts = pending.split(/\r?\n/);
      pending = parts.pop() || "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        lines.push(trimmed);
        if (lines.length > 50) lines.shift();
        if (onLine) onLine(trimmed);
      }
    });
  };

  attach(child.stdout, stdoutLines, onStdoutLine);
  attach(child.stderr, stderrLines, onStderrLine);

  return {
    child,
    stderr: () => stderrLines.join("\n"),
    stdout: () => stdoutLines.join("\n"),
    // Errors can show up on either stream depending on the output mode.
    output: () => `${stderrLines.join("\n")}\n${stdoutLines.join("\n")}`
  };
};

/** Turn yt-dlp's stderr into something a user can act on. */
const describeYtdlpError = (stderr, exitCode) => {
  const text = String(stderr || "");

  if (/HTTP Error 403|403: Forbidden/i.test(text)) {
    return "YouTube refused the media request (HTTP 403). Try another quality, or update yt-dlp with: yt-dlp -U";
  }
  if (/HTTP Error 429|Too Many Requests/i.test(text)) {
    return "YouTube is rate limiting this machine (HTTP 429). Wait a few minutes and try again.";
  }
  if (/ffmpeg exited with code/i.test(text)) {
    return "ffmpeg failed while merging the audio and video streams. Make sure ffmpeg is installed and on your PATH.";
  }
  if (/Requested format is not available/i.test(text)) {
    return "That quality is not available for this video. Please choose a different one.";
  }
  if (/Unable to extract|Unsupported URL|is not a valid URL/i.test(text)) {
    return "yt-dlp could not read that link. Double-check the URL.";
  }

  const lines = text.split("\n");
  const errorLine = lines.find((line) => /error/i.test(line)) || lines[0] || "";
  const cleaned = errorLine.replace(/^.*?ERROR:\s*/i, "").trim();
  return cleaned ? cleaned.substring(0, 300) : `yt-dlp exited with code ${exitCode}`;
};

const scheduleProgressCleanup = (jobId) => {
  setTimeout(() => clearProgress(jobId), 60 * 1000);
};

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

/**
 * Run `yt-dlp --dump-json` for a URL.
 *
 * yt-dlp-wrap appends "-f best" unless the argument list already contains
 * "--format". "best"/"b" select YouTube's pre-merged progressive formats, which
 * now fail with "Requested format is not available", so we always hand it our
 * own selector (which also switches off the "-f best selects the best
 * pre-merged format" warning).
 */
const fetchVideoInfo = async (url, { format = defaultFormat, extraArgs = [] } = {}) => {
  const args = [url, "--format", format || defaultFormat];
  if (jsRuntime) args.push("--js-runtimes", jsRuntime);
  return ytDlp.getVideoInfo([...args, ...extraArgs]);
};

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
    const info = await fetchVideoInfo(url, { extraArgs: ["--flat-playlist"] });
    
    return {
      title: info.title || 'Playlist',
      uploader: info.uploader || 'Unknown',
      description: info.description || '',
      thumbnail: info.thumbnail || null,
      playlist_count: info.playlist_count || 0,
      webpage_url: info.webpage_url || url
    };
  } catch (err) {
    if (isYtDlpNotFoundError(err)) {
      throw new Error(ytdlpMissingMessage);
    }

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
 * Get video information
 */
exports.getInfo = async (url) => {
  try {
    const result = await fetchVideoInfo(url);
    return JSON.stringify(result);
  } catch (err) {
    if (isYtDlpNotFoundError(err)) {
      throw new Error(ytdlpMissingMessage);
    }

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
    const info = await fetchVideoInfo(url);
    return info.formats || [];
  } catch (err) {
    throw new Error(`Failed to fetch formats: ${err.message}`);
  }
};

/**
 * YouTube serves video and audio as separate streams, so every usable download
 * is a combination of the two. Build one entry per available resolution using
 * selectors yt-dlp can actually resolve - never a bare "b", which selects the
 * progressive formats that now answer HTTP 403.
 */
const buildCombinedFormats = (formats) => {
  const videoFormats = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none" && f.height && f.protocol !== "m3u8_native"
  );
  const audioFormats = formats.filter(
    (f) => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none")
  );

  const bestAudio = audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
  const heights = [...new Set(videoFormats.map((f) => f.height))].sort((a, b) => b - a);

  return heights.map((height) => {
    const candidates = videoFormats.filter((f) => f.height === height);
    const h264 = candidates.find((f) => String(f.vcodec).startsWith("avc1"));
    const video = h264 || candidates[0];
    const size = (video && video.filesize ? video.filesize : 0) + (bestAudio && bestAudio.filesize ? bestAudio.filesize : 0);
    const selector = `bv*[height<=${height}]+ba`;

    return {
      format_id: selector,
      format: selector,
      ext: "mp4",
      resolution: video && video.fps ? `${height}p ${Math.round(video.fps)}fps` : `${height}p`,
      fps: video ? video.fps : null,
      vcodec: h264 ? "avc1 (H.264)" : (video && video.vcodec) || "unknown",
      acodec: (bestAudio && bestAudio.acodec) || "unknown",
      filesize: size,
      filesizetitle: size > 0 ? `~${(size / (1024 * 1024)).toFixed(1)} MiB` : "size unknown"
    };
  });
};

/**
 * Get filtered formats (presets + one combined entry per resolution)
 */
exports.getFormats = async (url) => {
  try {
    const info = await fetchVideoInfo(url);
    const formats = info.formats || [];

    // If no formats available, return presets only
    if (formats.length === 0) {
      return {
        presets: formatPresets,
        formats: [],
        note: "No individual formats detected. Use presets above."
      };
    }

    // One entry per resolution, each a video+audio combination
    const detailedFormats = buildCombinedFormats(formats);

    return {
      presets: formatPresets,
      formats: detailedFormats
    };
  } catch (err) {
    // Return presets even if formats fail to load
    return {
      presets: formatPresets,
      formats: [],
      note: "Could not load specific formats. Using presets.",
      error: err.message
    };
  }
};

/**
 * Resolve which format yt-dlp would pick for a selector without downloading
 * anything. The result tells the caller whether the download can be streamed
 * straight to the browser or has to be merged on disk first.
 */
exports.resolveSelection = async (url, format) => {
  const args = [
    ...baseArgs(),
    ...selectionArgs(format),
    "--simulate",
    "--no-playlist",
    "--print",
    SELECTION_TEMPLATE,
    url
  ];

  const { child, output } = spawnYtdlp(args);
  const stdout = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk.toString()));

  const code = await new Promise((resolve, reject) => {
    child.on("error", (err) =>
      reject(new Error(isYtDlpNotFoundError(err) ? ytdlpMissingMessage : err.message))
    );
    child.on("close", (exitCode) => resolve(exitCode));
  });

  if (code !== 0) {
    throw new Error(describeYtdlpError(output(), code));
  }

  const line = stdout.join("").split(/\r?\n/).filter((l) => l.includes("\t")).pop() || "";
  const [title, formatId, ext, protocol, vcodec, acodec, filesize, filesizeApprox, height] =
    line.split("\t");

  if (!formatId) {
    throw new Error("yt-dlp did not return a usable format for this link.");
  }

  return {
    title: (title || "").replace(/[\t\r\n]+/g, " ").trim(),
    formatId,
    ext: ext && ext !== "NA" ? ext : "mp4",
    protocol: protocol || "",
    vcodec: vcodec || "none",
    acodec: acodec || "none",
    height: toNumber(height),
    // Only a single plain https stream is guaranteed to produce exactly this
    // many bytes, so it is the only case where Content-Length is safe to send.
    filesize: toNumber(filesize),
    filesizeApprox: toNumber(filesizeApprox),
    needsMerge: formatId.includes("+"),
    hasVideo: !!vcodec && vcodec !== "none",
    hasAudio: !!acodec && acodec !== "none"
  };
};


/**
 * Stream a single already-muxed stream straight to the browser.
 *
 * The returned promise settles as soon as the first byte is on its way, which
 * is what lets the controller still answer with a real JSON error when yt-dlp
 * dies before producing anything.
 */
exports.startStream = async ({ url, format, jobId, responseStream, onFirstWrite }) => {
  createCancellationToken(jobId, url);
  await fs.ensureDir(fragmentDir);

  const args = [
    ...baseArgs(),
    ...selectionArgs(format),
    "--newline",
    "--progress-template", PROGRESS_TEMPLATE,
    "--paths", `temp:${fragmentDir}`,
    // An MP4 muxer needs a seekable output. Fragmented MP4 works in a pipe;
    // this is only a safety net, merged downloads go through downloadToFile().
    "--postprocessor-args", "Merger:-movflags frag_keyframe+empty_moov",
    "-o", "-",
    url
  ];

  console.log(`[YTDLP] Direct stream for job ${jobId} (${format || defaultFormat})`);

  const { child, output } = spawnYtdlp(args, {
    // The media itself goes to stdout here, so the textual output (and with it
    // the progress lines) arrives on stderr.
    onStderrLine: (line) => {
      const parsed = parseProgressLine(line);
      if (!parsed) return;
      setProgress(jobId, {
        progress: parsed.progress,
        downloaded: parsed.downloaded,
        total: parsed.total,
        raw: `Streaming ${formatBytes(parsed.downloaded)}${parsed.speed ? ` at ${formatBytes(parsed.speed)}/s` : ""}`
      });
    }
  });
  attachProcess(jobId, child);

  await new Promise((resolve, reject) => {
    let started = false;
    let settled = false;
    let downloadedSize = 0;

    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    const kill = () => {
      try {
        child.kill();
      } catch (err) {
        // process already gone
      }
    };

    const startupTimer = setTimeout(() => {
      if (settled) return;
      kill();
      const message = "yt-dlp did not start sending data in time. Please try again.";
      setProgress(jobId, { error: message, done: true });
      scheduleProgressCleanup(jobId);
      fail(new Error(message));
    }, streamStartupTimeoutMs);

    child.stdout.on("data", (chunk) => {
      if (settled) return;

      if (isCancelled(jobId)) {
        kill();
        succeed();
        return;
      }

      if (!started) {
        started = true;
        clearTimeout(startupTimer);
        try {
          if (onFirstWrite) onFirstWrite();
        } catch (err) {
          kill();
          fail(err);
          return;
        }
      }

      downloadedSize += chunk.length;
      try {
        const written = responseStream.write(chunk);
        if (!written) {
          child.stdout.pause();
          responseStream.once("drain", () => child.stdout.resume());
        }
      } catch (err) {
        console.error(`[YTDLP] Write to response failed for job ${jobId}: ${err.message}`);
        kill();
        succeed();
      }
    });

    // Browser went away (cancel / navigation): stop yt-dlp as well.
    responseStream.on("close", () => {
      if (!responseStream.writableFinished) {
        clearTimeout(startupTimer);
        kill();
        succeed();
      }
    });

    child.on("error", (err) => {
      if (settled) return;
      clearTimeout(startupTimer);
      fail(new Error(isYtDlpNotFoundError(err) ? ytdlpMissingMessage : err.message));
    });

    child.on("close", (code) => {
      if (settled) return;
      clearTimeout(startupTimer);

      if (!started) {
        // Nothing was written, so the caller can still send a real error.
        const message = describeYtdlpError(output(), code);
        setProgress(jobId, { error: message, done: true });
        scheduleProgressCleanup(jobId);
        fail(new Error(message));
        return;
      }

      if (code === 0 || code === null) {
        responseStream.end();
        setProgress(jobId, { progress: 100, downloaded: downloadedSize, total: downloadedSize, done: true });
      } else {
        console.error(`[YTDLP] Stream for job ${jobId} ended with code ${code}: ${output()}`);
        setProgress(jobId, { error: describeYtdlpError(output(), code), done: true });
        if (!responseStream.writableEnded) responseStream.end();
      }
      scheduleProgressCleanup(jobId);
      succeed();
    });
  });
};


/** Pick the real output from a job directory, ignoring .part/.ytdl leftovers. */
const findOutputFile = async (jobDir) => {
  const entries = await fs.readdir(jobDir, { withFileTypes: true });
  const files = entries.filter(
    (entry) => entry.isFile() && !/\.(part|ytdl|temp|json|webp)$/i.test(entry.name)
  );
  if (files.length === 0) return null;

  const stats = await Promise.all(
    files.map(async (entry) => {
      const fullPath = path.join(jobDir, entry.name);
      return { fullPath, size: (await fs.stat(fullPath)).size };
    })
  );

  return stats.sort((a, b) => b.size - a.size)[0].fullPath;
};

/**
 * A merged file is kept for a short while (config.tempFileTtlMs) so a paused
 * download can pick it up again with an HTTP Range request. Jobs whose
 * directory is older than that are removed on the next download.
 */
const cleanupExpiredJobs = async () => {
  let entries;
  try {
    entries = await fs.readdir(tmpDir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  const now = Date.now();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jobDir = path.join(tmpDir, entry.name);
    try {
      const stat = await fs.stat(jobDir);
      if (now - stat.mtimeMs > tempFileTtlMs) {
        await fs.remove(jobDir);
        console.log(`[YTDLP] Removed expired job directory ${entry.name}`);
      }
    } catch (err) {
      // ignore
    }
  }
};

/** Marker written once a merged file is complete. */
const DONE_MARKER = "done.json";

/**
 * Return a previously merged file for this job, if it is still around and the
 * caller is allowed to have it (same jobId).
 */
exports.findCompletedJob = async (jobId) => {
  if (!jobId) return null;

  const jobDir = path.join(tmpDir, jobId);
  try {
    const marker = await fs.readJson(path.join(jobDir, DONE_MARKER));
    const stat = await fs.stat(marker.filePath);
    if (stat.size !== marker.size) return null;
    return { filePath: marker.filePath, size: stat.size, ext: marker.ext };
  } catch (err) {
    return null;
  }
};

/**
 * Download to a temp file, used when video and audio have to be merged by
 * ffmpeg. Writing to a real file gives ffmpeg the seekable output an MP4
 * muxer needs, so the merge can no longer fail with
 * "muxer does not support non seekable output".
 */
exports.downloadToFile = async ({ url, format, jobId }) => {
  const jobDir = path.join(tmpDir, jobId);
  await cleanupExpiredJobs();

  // Already merged during an earlier request for this job: reuse the file.
  const finished = await exports.findCompletedJob(jobId);
  if (finished) {
    console.log(`[YTDLP] Job ${jobId} reusing merged file (${formatBytes(finished.size)})`);
    return finished;
  }

  await fs.ensureDir(jobDir);
  createCancellationToken(jobId, url);

  const args = [
    ...baseArgs(),
    ...selectionArgs(format),
    "--merge-output-format", "mp4",
    "--newline",
    "--progress-template", PROGRESS_TEMPLATE,
    "-o", path.join(jobDir, "video.%(ext)s"),
    url
  ];

  console.log(`[YTDLP] Merging download for job ${jobId} (${format || defaultFormat})`);

  const { child, output } = spawnYtdlp(args, {
    // Here stdout is free (the file goes to disk), and that is where yt-dlp
    // writes its progress lines.
    onStdoutLine: (line) => {
      const parsed = parseProgressLine(line);
      if (!parsed) return;
      setProgress(jobId, {
        progress: parsed.progress,
        downloaded: parsed.downloaded,
        total: parsed.total,
        raw: `Downloading ${formatBytes(parsed.downloaded)}${parsed.total ? ` of ${formatBytes(parsed.total)}` : ""}${parsed.speed ? ` at ${formatBytes(parsed.speed)}/s` : ""}`
      });
    }
  });
  attachProcess(jobId, child, null, jobDir);

  const code = await new Promise((resolve, reject) => {
    child.on("error", (err) =>
      reject(new Error(isYtDlpNotFoundError(err) ? ytdlpMissingMessage : err.message))
    );
    child.on("close", (exitCode) => resolve(exitCode));
  });

  if (isCancelled(jobId)) {
    await exports.cleanupJob(jobId);
    scheduleProgressCleanup(jobId);
    throw new Error("Download cancelled.");
  }

  if (code !== 0) {
    const message = describeYtdlpError(output(), code);
    console.error(`[YTDLP] Merge download failed for job ${jobId}: ${output()}`);
    await exports.cleanupJob(jobId);
    setProgress(jobId, { error: message, done: true });
    scheduleProgressCleanup(jobId);
    throw new Error(message);
  }

  const filePath = await findOutputFile(jobDir);
  if (!filePath) {
    await exports.cleanupJob(jobId);
    throw new Error("yt-dlp finished but did not produce a file.");
  }

  const { size } = await fs.stat(filePath);
  const ext = path.extname(filePath).replace(/^\./, "") || "mp4";

  // Mark it complete so a later Range request for this job can reuse it.
  await fs.writeJson(path.join(jobDir, DONE_MARKER), { filePath, size, ext });

  setProgress(jobId, {
    progress: 100,
    downloaded: size,
    total: size,
    done: true,
    file: path.basename(filePath)
  });
  scheduleProgressCleanup(jobId);
  removeToken(jobId);
  console.log(`[YTDLP] Job ${jobId} merged to ${path.basename(filePath)} (${formatBytes(size)})`);

  return { filePath, size, ext };
};

/** Remove a job's scratch directory (also used to purge a cancelled job). */
exports.cleanupJob = async (jobId) => {
  if (!jobId) return;
  removeToken(jobId);
  try {
    await fs.remove(path.join(tmpDir, jobId));
  } catch (err) {
    console.warn(`[YTDLP] Could not clean up job ${jobId}: ${err.message}`);
  }
};

/** Kill the yt-dlp process of a job and clean up its scratch files. */
exports.cancelJob = async (jobId) => {
  // A job that already finished has no token left, but its file may still be
  // there: remove it so "cancel" really discards the download.
  const result = await exports.abortJob(jobId);
  await exports.cleanupJob(jobId);
  return result;
};

/**
 * Stop the yt-dlp process of a job but KEEP an already finished file, so a
 * paused download can be resumed with a Range request. Used when the browser
 * simply goes away (abort, refresh, closed tab).
 */
exports.abortJob = async (jobId) => {
  const token = getCancellationToken(jobId);
  if (!token) {
    return { success: false, error: "Download not found" };
  }

  token.cancelled = true;
  if (token.process && token.process.pid) {
    try {
      process.kill(token.process.pid);
    } catch (err) {
      // process already gone
    }
  }

  return { success: true, message: "Download stopped" };
};

