import { useState, useEffect } from 'react';
import { Settings, Download, AlertCircle } from 'lucide-react';

const DEFAULT_SETTINGS = {
  defaultQuality: 'best[height<=720]',
  autoRefresh: true,
  refreshInterval: 5000,
  notificationsEnabled: true,
  maxConcurrentDownloads: 3,
  theme: 'light'
};

export function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('downloaderSettings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('downloaderSettings', JSON.stringify(settings));
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('downloaderSettings');
    setSaved(false);
    setHasChanges(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-gray-600 mb-8">Customize your download preferences</p>

        {/* Save Notification */}
        {saved && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            ✓ Settings saved successfully!
          </div>
        )}

        {/* Download Settings */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Download className="w-6 h-6" />
            Download Preferences
          </h2>

          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            {/* Default Quality */}
            <div>
              <label className="block text-sm font-semibold mb-2">Default Video Quality</label>
              <select
                value={settings.defaultQuality}
                onChange={(e) => handleChange('defaultQuality', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="best">Best Quality (Highest Resolution)</option>
                <option value="best[height<=1080]">1080p or Lower</option>
                <option value="best[height<=720]">720p or Lower (Recommended)</option>
                <option value="best[height<=480]">480p or Lower (Smaller File)</option>
                <option value="best[ext=mp4]">Best MP4 Format</option>
                <option value="worst">Smallest File Size</option>
              </select>
              <p className="text-gray-500 text-sm mt-1">Default quality preset for new downloads</p>
            </div>

            {/* Max Concurrent Downloads */}
            <div>
              <label className="block text-sm font-semibold mb-2">Max Concurrent Downloads</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxConcurrentDownloads}
                onChange={(e) => handleChange('maxConcurrentDownloads', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-gray-500 text-sm mt-1">How many videos can download at the same time</p>
            </div>
          </div>
        </section>

        {/* Interface Settings */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Interface Settings</h2>

          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            {/* Auto Refresh */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold mb-1">Auto Refresh Downloads</label>
                <p className="text-gray-500 text-sm">Automatically refresh active downloads status</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) => handleChange('autoRefresh', e.target.checked)}
                className="w-5 h-5 border-gray-300 rounded"
              />
            </div>

            {/* Refresh Interval */}
            {settings.autoRefresh && (
              <div>
                <label className="block text-sm font-semibold mb-2">Refresh Interval (ms)</label>
                <input
                  type="number"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={settings.refreshInterval}
                  onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-gray-500 text-sm mt-1">How often to check for status updates (in milliseconds)</p>
              </div>
            )}

            {/* Notifications */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-300">
              <div>
                <label className="block text-sm font-semibold mb-1">Browser Notifications</label>
                <p className="text-gray-500 text-sm">Get notified when downloads complete</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                className="w-5 h-5 border-gray-300 rounded"
              />
            </div>

            {/* Theme */}
            <div className="pt-4 border-t border-gray-300">
              <label className="block text-sm font-semibold mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark (Coming Soon)</option>
                <option value="auto">Auto (System Preference)</option>
              </select>
              <p className="text-gray-500 text-sm mt-1">Choose your preferred color scheme</p>
            </div>
          </div>
        </section>

        {/* Storage Info */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Storage Info</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Downloaded files location:</p>
              <p className="font-mono text-xs bg-white p-2 rounded mt-1">
                server/downloads/
              </p>
              <p className="mt-2">Maximum disk quota: <strong>5GB</strong></p>
              <p className="text-xs mt-1">Old files will be automatically deleted when quota is exceeded</p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleReset}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
          >
            Save Settings
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mt-8">
          <h3 className="font-bold text-gray-900 mb-2">💾 Settings Storage</h3>
          <p className="text-gray-600 text-sm">
            Your settings are saved locally in your browser. They will persist even after closing the app.
            Clearing your browser data will reset these settings.
          </p>
        </div>
      </div>
    </div>
  );
}
