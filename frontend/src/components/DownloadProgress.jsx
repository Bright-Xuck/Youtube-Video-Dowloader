import { Trash2, Loader } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import { useProgressStream } from '../hooks/useApi';
import { api } from '../services/api';

function DownloadProgressComponent({ jobId, onCancel, videoUrl }) {
  const { progress, done, error, raw } = useProgressStream(jobId);
  const [videoInfo, setVideoInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  useEffect(() => {
    if (videoUrl) {
      setInfoLoading(true);
      api.getVideoInfo(videoUrl)
        .then(response => {
          console.log('Full API response:', response);
          console.log('Response data:', response.data);
          // axios wraps the response in .data, so response.data is the video info
          const info = response.data;
          setVideoInfo(info);
        })
        .catch(err => {
          console.error('Failed to fetch video info for', videoUrl, ':', err);
        })
        .finally(() => setInfoLoading(false));
    }
  }, [videoUrl]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <p className="text-red-900 font-semibold">❌ Download Failed</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <p className="text-red-600 text-xs mt-2">Job ID: {jobId}</p>
          </div>
          <button
            onClick={() => onCancel(jobId)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <p className="text-green-900 font-semibold">✓ Download Completed!</p>
            <p className="text-green-700 text-sm mt-1">
              {raw?.filename ? `File: ${raw.filename}` : 'Your download is ready'}
            </p>
            {raw?.filesize && (
              <p className="text-green-600 text-xs mt-1">
                Size: {(raw.filesize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <p className="text-green-600 text-xs mt-1">Job ID: {jobId}</p>
          </div>
          <button
            onClick={() => onCancel(jobId)}
            className="text-green-600 hover:text-green-700"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
      <div className="flex gap-4">
        {/* Video Thumbnail */}
        {videoInfo?.thumbnail || videoInfo?.thumbnails?.[0]?.url ? (
          <div className="shrink-0 relative">
            <img
              src={videoInfo.thumbnail || videoInfo.thumbnails[0].url}
              alt="Video thumbnail"
              className="w-24 h-24 rounded object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                console.error('Failed to load thumbnail:', e.target.src);
                // Try fallback thumbnail
                if (videoInfo?.thumbnails?.[0]?.url && e.target.src !== videoInfo.thumbnails[0].url) {
                  e.target.src = videoInfo.thumbnails[0].url;
                } else {
                  e.target.parentElement.style.display = 'none';
                }
              }}
            />
          </div>
        ) : infoLoading ? (
          <div className="shrink-0 w-24 h-24 rounded bg-gray-200 animate-pulse" />
        ) : null}
        
        <div className="flex-1">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                <p className="text-blue-900 font-semibold">Downloading...</p>
              </div>
              {videoInfo?.title && (
                <p className="text-blue-700 text-sm mt-1 line-clamp-2">{videoInfo.title}</p>
              )}
              {raw?.filename && (
                <p className="text-blue-600 text-xs mt-1 truncate">File: {raw.filename}</p>
              )}
            </div>
            <button
              onClick={() => onCancel(jobId)}
              className="text-blue-600 hover:text-blue-700 shrink-0"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Progress Stats */}
          <div className="flex justify-between items-center">
            <p className="text-blue-700 text-sm font-semibold">{Math.round(progress)}%</p>
            <div className="text-blue-600 text-xs space-y-0.5 text-right">
              {raw?.ext && <p>Format: {raw.ext}</p>}
              {raw?._current_bytes && raw._total_bytes && (
                <p>
                  {(raw._current_bytes / 1024 / 1024).toFixed(1)} MB / {(raw._total_bytes / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
              {raw?.speed && <p>Speed: {raw.speed}</p>}
              {raw?.eta && <p>ETA: {raw.eta}</p>}
            </div>
          </div>

          <p className="text-blue-600 text-xs mt-2">Job ID: {jobId}</p>
        </div>
      </div>
    </div>
  );
}

export const DownloadProgress = memo(DownloadProgressComponent, (prevProps, nextProps) => {
  // Return true if props are equal (don't re-render), false if different (re-render)
  return prevProps.jobId === nextProps.jobId && 
         prevProps.videoUrl === nextProps.videoUrl &&
         prevProps.onCancel === nextProps.onCancel;
});
