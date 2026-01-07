import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

export const useProgressStream = (jobId) => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState('');

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`http://localhost:3000/api/youtube/progress/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data.progress || 0);
        setRaw(data.raw || '');
        
        if (data.error) {
          setError(data.error);
          setDone(true);
          eventSource.close();
        } else if (data.done) {
          setDone(true);
          eventSource.close();
        }
      } catch (err) {
        setError('Failed to parse progress data');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError('Connection lost');
      eventSource.close();
    };

    return () => eventSource.close();
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
      setError(err.response?.data?.details || err.message);
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
      setError(err.response?.data?.error || err.message);
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
 * Hook for browser-based video downloads with pause/resume support
 */
export const useBrowserDownload = () => {
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [controller, setController] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const startDownload = useCallback(async (url, format) => {
    setError(null);
    setDownloading(true);
    setIsDownloading(true);
    setPaused(false);
    setProgress(0);
    setDownloadedSize(0);
    setTotalSize(0);

    try {
      const abortController = new AbortController();
      setController(abortController);

      const response = await fetch(
        `http://localhost:3000/api/youtube/stream?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`,
        { signal: abortController.signal }
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use the status message
        }
        throw new Error(errorMessage);
      }

      // Get total file size from Content-Length header if available
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        setTotalSize(parseInt(contentLength, 10));
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'download.mp4';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Read the response body as a stream
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      while (isDownloading) {
        try {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          receivedLength += value.length;

          // Update progress
          if (contentLength) {
            const progressPercent = (receivedLength / parseInt(contentLength, 10)) * 100;
            setProgress(Math.round(progressPercent));
          }
          setDownloadedSize(receivedLength);
        } catch (err) {
          if (err.name === 'AbortError') {
            setError('Download cancelled');
          } else {
            throw err;
          }
          break;
        }
      }

      if (!isDownloading) {
        // Download was cancelled
        reader.cancel();
        setDownloading(false);
        setIsDownloading(false);
        return;
      }

      // Create blob and download
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);

      setProgress(100);
      setDownloading(false);
      setIsDownloading(false);
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message || 'Download failed');
      setDownloading(false);
      setIsDownloading(false);
    }
  }, [isDownloading]);

  const pauseDownload = useCallback(() => {
    setPaused(true);
    if (controller) {
      controller.abort();
    }
  }, [controller]);

  const resumeDownload = useCallback(() => {
    // Resume is not directly supported with AbortController
    // The user will need to restart the download
    setPaused(false);
  }, []);

  const cancelDownload = useCallback(() => {
    setIsDownloading(false);
    setDownloading(false);
    setPaused(false);
    setProgress(0);
    setDownloadedSize(0);
    if (controller) {
      controller.abort();
    }
    setError('Download cancelled by user');
  }, [controller]);

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