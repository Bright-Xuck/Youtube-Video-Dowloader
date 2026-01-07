import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/youtube';

export const api = {
  // Get video information
  getVideoInfo: (url) => {
    return axios.get(`${API_BASE}/info`, { params: { url } });
  },

  // Get available formats
  getFormats: (url) => {
    return axios.get(`${API_BASE}/formats`, { params: { url } });
  },

  // Start a download
  startDownload: (url, format, isPlaylist = false) => {
    return axios.get(`${API_BASE}/download`, {
      params: { url, format, playlist: isPlaylist }
    });
  },

  // Stream progress (SSE)
  streamProgress: (jobId) => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${API_BASE}/progress/${jobId}`);
      
      const updates = [];
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updates.push(data);
          resolve({ ...data, updates });
          
          if (data.done || data.error) {
            eventSource.close();
          }
        } catch (err) {
          reject(err);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        reject(new Error('Progress stream error'));
      };
    });
  },

  // Get progress updates (alternative to SSE with polling)
  getProgress: (jobId) => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${API_BASE}/progress/${jobId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          resolve(data);
          if (data.done || data.error) {
            eventSource.close();
          }
        } catch (err) {
          reject(err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        reject(new Error('Failed to connect to progress stream'));
      };
    });
  },

  // Cancel a download
  cancelDownload: (jobId) => {
    return axios.post(`${API_BASE}/cancel/${jobId}`);
  },

  // Get active downloads
  getActiveDownloads: () => {
    return axios.get(`${API_BASE}/downloads`);
  },

  // Get disk statistics
  getDiskStats: () => {
    return axios.get(`${API_BASE}/disk-stats`);
  },

  // Download playlist as ZIP
  downloadPlaylistZip: (url) => {
    return axios.get(`${API_BASE}/playlist/zip`, {
      params: { url },
      responseType: 'blob'
    });
  },

  // Health check
  healthCheck: () => {
    return axios.get('http://localhost:3000/health');
  }
};
