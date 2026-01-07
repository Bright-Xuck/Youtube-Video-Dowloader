import { useState } from 'react';
import { Download, AlertCircle, Loader, Music } from 'lucide-react';
import { api } from '../services/api';
import { useVideoInfo } from '../hooks/useApi';

export function PlaylistPage() {
  const [url, setUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { info, loading, fetch: fetchInfo } = useVideoInfo();

  const handleFetchInfo = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!url.trim()) {
      setError('Please enter a playlist URL');
      return;
    }

    await fetchInfo(url);
  };

  const handleDownloadPlaylist = async () => {
    setError(null);
    setSuccess(null);

    try {
      setDownloading(true);
      const response = await api.downloadPlaylistZip(url);
      
      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `playlist-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess('Playlist downloaded successfully!');
      setUrl('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download playlist');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Music className="w-8 h-8" />
          Download Playlist
        </h1>
        <p className="text-gray-600 mb-8">Download entire playlists as a ZIP file</p>

        {/* URL Input */}
        <form onSubmit={handleFetchInfo} className="mb-8">
          <label className="block text-sm font-semibold mb-2">Playlist URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Music className="w-5 h-5" />}
              Fetch Info
            </button>
          </div>
        </form>

        {/* Errors */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            ✓ {success}
          </div>
        )}

        {/* Playlist Info */}
        {info && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            {info.thumbnail && (
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full max-w-xs h-auto rounded-lg mb-4 object-cover"
              />
            )}
            <h2 className="text-2xl font-bold mb-2">{info.title}</h2>
            <p className="text-gray-600 mb-4">{info.uploader}</p>
            
            {info.playlist_count && (
              <div className="bg-white rounded p-4 inline-block">
                <p className="text-gray-500 text-sm">Videos in Playlist</p>
                <p className="text-2xl font-bold text-blue-600">{info.playlist_count}</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                💡 <strong>Tip:</strong> All videos will be downloaded and packaged in a single ZIP file for easy transfer.
              </p>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadPlaylist}
              disabled={downloading}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
            >
              {downloading ? <Loader className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
              {downloading ? 'Downloading...' : 'Download as ZIP'}
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-yellow-900 mb-3">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-800 text-sm">
            <li>Paste a YouTube playlist URL above</li>
            <li>Click "Fetch Info" to see playlist details</li>
            <li>Click "Download as ZIP" to download all videos</li>
            <li>The system will download all videos in the best available quality</li>
            <li>A ZIP file will be created and downloaded to your computer</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
