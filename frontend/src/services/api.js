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

  // Stream video directly to browser (browser-based download)
  // Works for both single videos and playlists
  streamVideo: (url, format = 'bv*+ba/b') => {
    return `${API_BASE}/stream?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`;
  },

  // Get flat list of videos in a playlist
  getPlaylistVideos: (url) => {
    return axios.get(`${API_BASE}/playlist-videos`, { params: { url } });
  },

  // Health check
  healthCheck: () => {
    return axios.get('http://localhost:3000/health');
  }
};
