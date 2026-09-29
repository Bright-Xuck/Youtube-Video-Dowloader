import { useState, useCallback, useEffect, useRef } from 'react';
import { api, createJobId } from '../services/api';

/** Turn a browser fetch failure into something a user can act on. */
const friendlyError = (err) => {
  if (!err) return 'Download failed';
  if (err.name === 'AbortError') return 'Download stopped';
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err.message || '')) {
    return 'Lost the connection to the backend. Make sure it is running on port 3000, then try again.';
  }
  return err.message || 'Download failed';
};

/** "bytes 1000-2000/3000" -> 3000 */
const totalFromContentRange = (header) => {
  const match = /\/(\d+)\s*$/.exec(header || '');
  return match ? Number(match[1]) : 0;
};

/** Prefer the RFC 5986 filename so titles with emoji/accents survive. */
const filenameFrom = (contentDisposition) => {
  if (!contentDisposition) return null;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // fall through to the plain filename
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return plain ? plain[1] : null;
};

/** Open the progress stream of a job; returns a close() handle. */
const openProgressStream = (jobId, onUpdate) => {
  if (!jobId || typeof EventSource === 'undefined') return null;

  const source = new EventSource(api.progressUrl(jobId));
  source.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data));
    } catch {
      // ignore a malformed frame
    }
  };
  // The endpoint stays open on purpose; failures are reported by the download
  // request itself, so do not turn this into an error.
  source.onerror = () => source.close();

  return source;
};

export const useProgressStream = (jobId) => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState('');

  useEffect(() => {
    if (!jobId) return undefined;

    const source = openProgressStream(jobId, (data) => {
      setProgress(data.progress || 0);
      setRaw(data.raw || '');

      if (data.error) {
        setError(data.error);
        setDone(true);
      } else if (data.done) {
        setDone(true);
      }
    });

    return () => source?.close();
  }, [jobId]);

  return { progress, done, error, raw };
};

export const useVideoInfo = () => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getVideoInfo(url);
      setInfo(response.data);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { info, loading, error, fetch };
};

export const useFormats = () => {
  const [formats, setFormats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getFormats(url);
      setFormats(response.data);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { formats, loading, error, fetch };
};

export const useDiskStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getDiskStats();
        setStats(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getDiskStats();
      setStats(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, refetch };
};

export const useActiveDownloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setError(null);
      try {
        const response = await api.getActiveDownloads();
        setDownloads(response.data.downloads || []);
      } catch (err) {
        setError(err.message);
      } finally {
        // Only set loading to false after first fetch
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(() => {
      // Poll without triggering loading state changes
      api.getActiveDownloads()
        .then(response => setDownloads(response.data.downloads || []))
        .catch(err => setError(err.message));
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getActiveDownloads();
      setDownloads(response.data.downloads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { downloads, loading, error, refetch };
};

/**
 * Hook for downloading a video into the browser, with real pause/resume.
 *
 * The backend answers with the finished file (exact Content-Length), so the
 * browser can count bytes reliably. A pause aborts the request but keeps the
 * bytes that already arrived; resuming asks the backend for the rest with a
 * Range header, which it can serve as long as its scratch file is around.
 */
export const useBrowserDownload = () => {
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const abortRef = useRef(null);
  const activeRef = useRef(false);
  const requestRef = useRef(null); // { url, format, jobId }
  const chunksRef = useRef([]); // partial data, kept across a pause
  const receivedRef = useRef(0);

  const saveBlob = useCallback((chunks, type, filename) => {
    const blob = new Blob(chunks, { type: type || 'video/mp4' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }, []);

  const startDownload = useCallback(async (url, format, { resume = false, jobId } = {}) => {
    setError(null);
    setPaused(false);
    setDownloading(true);
    activeRef.current = true;

    if (!resume) {
      chunksRef.current = [];
      receivedRef.current = 0;
      setProgress(0);
      setDownloadedSize(0);
      setTotalSize(0);
    }

    const currentJobId = jobId || requestRef.current?.jobId || createJobId();
    requestRef.current = { url, format, jobId: currentJobId };

    // The backend downloads and merges first, then sends the file, so the
    // interesting progress happens before any body bytes arrive.
    const progressSource = openProgressStream(currentJobId, (data) => {
      if (typeof data.total === 'number' && data.total > 0) {
        setTotalSize((previous) => (previous > 0 ? previous : data.total));
      }
      if (typeof data.downloaded === 'number' && typeof data.progress === 'number') {
        setDownloadedSize((previous) => Math.max(previous, data.downloaded));
        setProgress(Math.min(99, Math.round(data.progress)));
      }
      if (data.error) setError(data.error);
    });

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;

      const headers = {};
      if (resume && receivedRef.current > 0) {
        headers.Range = `bytes=${receivedRef.current}-`;
      }

      const response = await fetch(api.streamVideo(url, format, currentJobId), {
        signal: abortController.signal,
        headers
      });


      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const payload = await response.json();
          message = payload.details || payload.error || message;
        } catch {
          // not JSON (e.g. the stream was cut): keep the status message
        }
        throw new Error(message);
      }

      // A plain 200 means the backend restarted the file from scratch (scratch
      // file gone): whatever we kept is useless.
      if (resume && response.status === 200) {
        chunksRef.current = [];
        receivedRef.current = 0;
        setDownloadedSize(0);
      }

      const total =
        totalFromContentRange(response.headers.get('content-range')) ||
        Number(response.headers.get('content-length')) ||
        0;
      if (total > 0) setTotalSize(total);

      const filename = filenameFrom(response.headers.get('content-disposition')) || 'download.mp4';
      const reader = response.body.getReader();

      while (activeRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        chunksRef.current.push(value);
        receivedRef.current += value.length;
        setDownloadedSize(receivedRef.current);

        if (total > 0) {
          setProgress(Math.min(99, Math.round((receivedRef.current / total) * 100)));
        }
      }

      if (!activeRef.current) {
        // Paused or cancelled: keep whatever arrived so resume can continue.
        try {
          await reader.cancel();
        } catch {
          // already closed
        }
        return;
      }

      // TODO: the file is buffered in memory before it is saved, which is a
      // lot for big videos. The proper fix is the File System Access API (or
      // handing the URL to the browser's own download manager).
      saveBlob(chunksRef.current, response.headers.get('content-type'), filename);

      setProgress(100);
      chunksRef.current = [];
      receivedRef.current = 0;
      requestRef.current = null;
    } catch (err) {
      if (activeRef.current) {
        setError(friendlyError(err));
      }
    } finally {
      progressSource?.close();
      activeRef.current = false;
      abortRef.current = null;
      setDownloading(false);
    }
  }, [saveBlob]);


  const pauseDownload = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    abortRef.current?.abort();
    setPaused(true);
    setError('Paused. The data received so far is kept, so resuming continues from there.');
  }, []);

  const resumeDownload = useCallback(() => {
    const request = requestRef.current;
    if (!request) {
      setError('There is no paused download to resume.');
      return;
    }
    startDownload(request.url, request.format, {
      resume: true,
      jobId: request.jobId
    });
  }, [startDownload]);

  const cancelDownload = useCallback(() => {
    const jobId = requestRef.current?.jobId;

    activeRef.current = false;
    abortRef.current?.abort();
    chunksRef.current = [];
    receivedRef.current = 0;
    requestRef.current = null;

    setPaused(false);
    setProgress(0);
    setDownloadedSize(0);
    setError('Download cancelled.');

    if (jobId) api.cancelDownload(jobId).catch(() => {});
  }, []);

  return {
    progress,
    downloading,
    paused,
    error,
    downloadedSize,
    totalSize,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload
  };
};

