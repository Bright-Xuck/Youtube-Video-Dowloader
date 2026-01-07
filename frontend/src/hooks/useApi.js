import { useState, useCallback, useEffect, useRef } from 'react';
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
  
  // Use refs to track mutable state
  const controllerRef = useRef(null);
  const isActiveRef = useRef(false);

  const startDownload = useCallback(async (url, format) => {
    console.log('[DOWNLOAD] Starting download...', { url, format });
    
    setError(null);
    setDownloading(true);
    setPaused(false);
    setProgress(0);
    setDownloadedSize(0);
    setTotalSize(0);
    isActiveRef.current = true;

    try {
      const abortController = new AbortController();
      controllerRef.current = abortController;

      const streamUrl = `http://localhost:3000/api/youtube/stream?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`;
      console.log('[DOWNLOAD] Fetching from:', streamUrl);

      // If this is a single video (not a playlist), prefer letting the browser handle the download
      const isPlaylist = /[?&]list=/.test(url);
      if (!isPlaylist) {
        try {
          // Open the stream URL directly so the browser shows it in the downloads UI
          window.open(streamUrl, '_blank');
          // Let the browser manage the download; close our UI state
          setProgress(0);
          setDownloading(false);
          controllerRef.current = null;
          isActiveRef.current = false;
          return; // Native download started
        } catch (err) {
          console.warn('[DOWNLOAD] Native download failed, falling back to fetch streaming', err);
          // fallthrough to fetch-based streaming
        }
      }

      const response = await fetch(streamUrl, { 
        signal: abortController.signal,
        method: 'GET'
      });

      console.log('[DOWNLOAD] Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('[DOWNLOAD] Error response:', errorData);
        } catch (e) {
          console.error('[DOWNLOAD] Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      // Get total file size from Content-Length header if available
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        setTotalSize(size);
        console.log('[DOWNLOAD] Total size:', (size / (1024 * 1024)).toFixed(2), 'MB');
      } else {
        console.log('[DOWNLOAD] No content-length header found');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'download.mp4';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
          console.log('[DOWNLOAD] Filename:', filename);
        }
      }

      // Check if response.body is available
      if (!response.body) {
        throw new Error('Response body is not available for streaming');
      }

      // Read the response body as a stream
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;
      let lastLogTime = Date.now();

      console.log('[DOWNLOAD] Starting to read stream...');

      while (isActiveRef.current) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            console.log('[DOWNLOAD] Stream complete');
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          // Update progress
          const progressPercent = contentLength 
            ? Math.min((receivedLength / parseInt(contentLength, 10)) * 100, 99)
            : 0;
          
          setProgress(Math.round(progressPercent));
          setDownloadedSize(receivedLength);

          // Log progress periodically
          const now = Date.now();
          if (now - lastLogTime > 2000) {
            console.log('[DOWNLOAD] Progress:', 
              Math.round(progressPercent) + '%', 
              (receivedLength / (1024 * 1024)).toFixed(2) + ' MB'
            );
            lastLogTime = now;
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('[DOWNLOAD] Download was cancelled');
            setError('Download cancelled');
            break;
          }
          throw err;
        }
      }

      if (!isActiveRef.current) {
        // Download was cancelled
        console.log('[DOWNLOAD] Download was cancelled by user');
        reader.cancel();
        setDownloading(false);
        return;
      }

      console.log('[DOWNLOAD] Creating blob and triggering download...');

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

      console.log('[DOWNLOAD] Download complete!');
      setProgress(100);
      setDownloading(false);
      
    } catch (err) {
      console.error('[DOWNLOAD] Download error:', err);
      setError(err.message || 'Download failed');
      setDownloading(false);
      isActiveRef.current = false;
    }
  }, []);

  const pauseDownload = useCallback(() => {
    console.log('[DOWNLOAD] Pausing download...');
    setPaused(true);
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);

  const resumeDownload = useCallback(() => {
    console.log('[DOWNLOAD] Resume not implemented - user needs to restart');
    // Resume is not directly supported with AbortController
    // The user will need to restart the download
    setPaused(false);
    setError('Please restart the download. Resume is not yet supported.');
  }, []);

  const cancelDownload = useCallback(() => {
    console.log('[DOWNLOAD] Cancelling download...');
    isActiveRef.current = false;
    setDownloading(false);
    setPaused(false);
    setProgress(0);
    setDownloadedSize(0);
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setError('Download cancelled by user');
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