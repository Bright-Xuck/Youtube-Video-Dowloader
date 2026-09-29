import axios from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
const API_BASE = `${API_ORIGIN}/api/youtube`;

/**
 * Job ids are created in the browser so the UI can subscribe to the
 * server-sent progress events before the download request is answered
 * (the backend only starts sending a file once yt-dlp has finished).
 */
export const createJobId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const api = {
  // Get video information
  getVideoInfo: (url) => {
    return axios.get(`${API_BASE}/info`, { params: { url } });
  },

  // Get available formats
  getFormats: (url) => {
    return axios.get(`${API_BASE}/formats`, { params: { url } });
  },

  // Download URL (works for both single videos and merged audio+video)
  streamVideo: (url, format = 'bv*+ba', jobId) => {
    const params = new URLSearchParams({ url, format });
    if (jobId) params.set('jobId', jobId);
    return `${API_BASE}/stream?${params.toString()}`;
  },

  // Server-sent progress for a job
  progressUrl: (jobId) => `${API_BASE}/progress/${jobId}`,

  // Job management
  getActiveDownloads: () => axios.get(`${API_BASE}/downloads`),
  cancelDownload: (jobId) => axios.post(`${API_BASE}/cancel/${jobId}`),
  getDiskStats: () => axios.get(`${API_BASE}/disk-stats`),

  // Health check
  healthCheck: () => {
    return axios.get(`${API_ORIGIN}/health`);
  }
};
