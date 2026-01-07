import { useState, useEffect } from 'react';
import { Download, AlertCircle, Play, Loader, Pause, Play as PlayIcon } from 'lucide-react';
import { api } from '../services/api';
import { useVideoInfo, useFormats, useBrowserDownload } from '../hooks/useApi';

export function DownloadPage() {
  const [url, setUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [localError, setLocalError] = useState(null);

  const { info, loading: infoLoading, error: infoError, fetch: fetchInfo } = useVideoInfo();
  const { formats, loading: formatsLoading, error: formatsError, fetch: fetchFormats } = useFormats();
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
      setLocalError('Please enter a YouTube URL');
      return;
    }
    
    await fetchInfo(url);
    await fetchFormats(url);
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    setLocalError(null);
    
    try {
      await startDownload(url, selectedFormat);
    } catch (err) {
      setLocalError(err.message || 'Failed to start download');
    }
  };

  const downloadedMB = (downloadedSize / (1024 * 1024)).toFixed(2);
  const totalMB = totalSize > 0 ? (totalSize / (1024 * 1024)).toFixed(2) : '?';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8">Download Video</h1>

        {/* URL Input */}
        <form onSubmit={handleFetchInfo} className="mb-8">
          <label className="block text-sm font-semibold mb-2">YouTube URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={infoLoading || !url.trim() || downloading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {infoLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Fetch Info
            </button>
          </div>
        </form>

        {/* Errors */}
        {(localError || infoError || formatsError || downloadError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{localError || infoError || formatsError || downloadError}</p>
          </div>
        )}

        {/* Video Info */}
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
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-semibold">{info.duration ? `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Views</p>
                <p className="font-semibold">{info.view_count?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Rating</p>
                <p className="font-semibold">{info.average_rating || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quality Selection */}
        {formats && !downloading && (
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-4">Select Quality</label>
            
            {/* Presets */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-600 mb-3">QUICK PRESETS</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {formats.presets?.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedFormat(preset.format)}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors ${
                      selectedFormat === preset.format
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Formats */}
            {formats.formats?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3">DETAILED FORMATS</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formats.formats.map((fmt) => (
                    <button
                      key={fmt.format_id}
                      onClick={() => setSelectedFormat(fmt.format_id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedFormat === fmt.format_id
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-600'
                      }`}
                    >
                      <p className="font-semibold">{fmt.resolution || 'Unknown'} • {fmt.ext}</p>
                      <p className="text-sm opacity-75">{fmt.vcodec} + {fmt.acodec} • {fmt.filesizetitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download Button */}
        {info && formats && !downloading && (
          <button
            onClick={handleDownload}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-6 h-6" />
            Start Download
          </button>
        )}

        {/* Download Progress Display */}
        {downloading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-900">
                {paused ? '⏸️ Download Paused' : '⬇️ Downloading...'}
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
                    setSelectedFormat('best');
                  }}
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Download Another Video
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

