import { Download, Trash2, AlertCircle } from 'lucide-react';
import { useActiveDownloads } from '../hooks/useApi';
import { api } from '../services/api';
import { useState, useCallback } from 'react';
import { DownloadProgress } from '../components/DownloadProgress';

export function DownloadsPage() {
  const { downloads, loading, error, refetch } = useActiveDownloads();
  const [cancelError, setCancelError] = useState(null);

  const handleCancel = useCallback(async (jobId) => {
    try {
      setCancelError(null);
      await api.cancelDownload(jobId);
      await refetch();
    } catch (err) {
      setCancelError(`Failed to cancel ${jobId}: ${err.message}`);
    }
  }, [refetch]);

  if (loading && downloads.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-gray-600">Loading active downloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Download className="w-8 h-8" />
          Active Downloads
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {cancelError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{cancelError}</p>
          </div>
        )}

        {downloads.length === 0 ? (
          <div className="text-center py-16">
            <Download className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No active downloads</p>
            <p className="text-gray-500 text-sm mt-2">Started downloads will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {downloads.map((download) => (
              <DownloadProgress
                key={download.jobId}
                jobId={download.jobId}
                videoUrl={download.url}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        <div className="mt-8 pt-8 border-t">
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
