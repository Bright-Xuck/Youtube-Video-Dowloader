import { useState } from 'react';
import { Download, AlertCircle, Loader, Music, Pause, Play as PlayIcon } from 'lucide-react';
import { useVideoInfo, useBrowserDownload } from '../hooks/useApi';

export function PlaylistPage() {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState(null);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const { 
    progress, 
    downloading, 
    paused, 
    error: downloadError,
    downloadedSize,
    totalSize,
    startDownload, 
    pauseDownload, 
    resumeDownload, 
    cancelDownload 
  } = useBrowserDownload();

  const handleFetchInfo = async (e) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!url.trim()) {
      setLocalError('Please enter a playlist URL');
      return;
    }

    setLoadingPlaylist(true);
    try {
      const response = await fetch(`http://localhost:3000/api/youtube/playlist-info?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error);
      }
      const info = await response.json();
      setPlaylistInfo(info);
    } catch (err) {
      setLocalError(err.message || 'Failed to fetch playlist info');
      setPlaylistInfo(null);
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handleDownloadPlaylist = async () => {
    setLocalError(null);

    try {
      // Download playlist videos as individual files
      // (Browser will handle them based on browser's download settings)
      await startDownload(url, 'bv*+ba/b');
    } catch (err) {
      setLocalError(err.message || 'Failed to download playlist');
    }
  };

  const downloadedMB = (downloadedSize / (1024 * 1024)).toFixed(2);
  const totalMB = totalSize > 0 ? (totalSize / (1024 * 1024)).toFixed(2) : '?';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Music className="w-8 h-8" />
          Download Playlist
        </h1>
        <p className="text-gray-600 mb-8">Download all videos from a playlist</p>

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
              disabled={loadingPlaylist || !url.trim() || downloading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {loadingPlaylist ? <Loader className="w-5 h-5 animate-spin" /> : <Music className="w-5 h-5" />}
              Fetch Info
            </button>
          </div>
        </form>

        {/* Errors */}
        {(localError || downloadError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{localError || downloadError}</p>
          </div>
        )}

        {/* Playlist Info */}
        {playlistInfo && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            {playlistInfo.thumbnail && (
              <img
                src={playlistInfo.thumbnail}
                alt={playlistInfo.title}
                className="w-full max-w-xs h-auto rounded-lg mb-4 object-cover"
              />
            )}
            <h2 className="text-2xl font-bold mb-2">{playlistInfo.title}</h2>
            <p className="text-gray-600 mb-4">{playlistInfo.uploader}</p>
            
            {playlistInfo.playlist_count && (
              <div className="bg-white rounded p-4 inline-block">
                <p className="text-gray-500 text-sm">Videos in Playlist</p>
                <p className="text-2xl font-bold text-blue-600">{playlistInfo.playlist_count}</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                💡 <strong>Tip:</strong> All videos will be downloaded sequentially to your Downloads folder.
              </p>
            </div>

            {/* Download Button */}
            {!downloading && (
              <button
                onClick={handleDownloadPlaylist}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-6 h-6" />
                Download Playlist
              </button>
            )}
          </div>
        )}

        {/* Download Progress Display */}
        {downloading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-900">
                {paused ? '⏸️ Download Paused' : '⬇️ Downloading Playlist...'}
              </h3>
              {progress === 100 && (
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  ✓ Complete
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">{progress}%</span>
                <span className="text-sm text-gray-600">
                  {downloadedMB} MB / {totalMB} MB
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            {progress < 100 && (
              <div className="flex gap-3">
                {!paused ? (
                  <button
                    onClick={pauseDownload}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeDownload}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <PlayIcon className="w-5 h-5" />
                    Resume
                  </button>
                )}
                <button
                  onClick={cancelDownload}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {progress === 100 && (
              <div className="bg-green-100 border border-green-400 rounded-lg p-4 text-green-800">
                <p className="font-semibold">✓ Download complete! Check your downloads folder.</p>
                <button
                  onClick={() => {
                    setUrl('');
                    window.location.reload();
                  }}
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Download Another Playlist
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        {!downloading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
            <h3 className="font-bold text-yellow-900 mb-3">How it works</h3>
            <ol className="list-decimal list-inside space-y-2 text-yellow-800 text-sm">
              <li>Paste a YouTube playlist URL above</li>
              <li>Click "Fetch Info" to see playlist details</li>
              <li>Click "Download Playlist" to start downloading</li>
              <li>All videos will download with pause/resume support</li>
              <li>Videos are saved to your Downloads folder as they download</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

