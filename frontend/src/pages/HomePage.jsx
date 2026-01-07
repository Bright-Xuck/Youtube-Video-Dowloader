import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Play, Zap } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Download YouTube Videos
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Fast, easy, and reliable. Download individual videos or entire playlists in seconds.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/downloader')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Start Downloading
            </button>
            <button
              onClick={() => navigate('/playlist')}
              className="bg-gray-700 hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Playlist
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <Play className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Multiple Formats</h3>
            <p className="text-gray-600">
              Choose from various quality presets (720p, 480p, 360p, Audio-Only) or select a specific format.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <Zap className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Fast Downloads</h3>
            <p className="text-gray-600">
              Parallel downloading with real-time progress tracking. Download multiple videos at once.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <Download className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Playlist Support</h3>
            <p className="text-gray-600">
              Download entire playlists with one click and get them as a convenient ZIP file.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Auto-cleanup when storage limit reached</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Cancel downloads anytime</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Real-time download progress</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Rate limiting protection</span>
              </li>
            </ul>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Monitor multiple downloads</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Storage usage indicator</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>Supports age-restricted content</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold mt-1">✓</span>
                <span>MP3 audio extraction</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg mb-6">
            It only takes a few seconds to download your first video.
          </p>
          <button
            onClick={() => navigate('/downloader')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Download Now
          </button>
        </div>
      </div>
    </div>
  );
}
