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
