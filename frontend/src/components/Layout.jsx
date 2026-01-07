import { useNavigate } from 'react-router-dom';
import { Download, List, Music, Settings, HelpCircle, Home } from 'lucide-react';
import { useDiskStats } from '../hooks/useApi';

export function Header() {
  const navigate = useNavigate();
  const { stats, error } = useDiskStats();

  const diskPercentage = stats?.percentUsed || 0;
  const diskWarning = diskPercentage > 80;

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Download className="w-8 h-8" />
            <h1 className="text-3xl font-bold">YouTube Downloader</h1>
          </div>
          
          {stats && !error && (
            <div className={`px-4 py-2 rounded-lg ${diskWarning ? 'bg-red-500' : 'bg-blue-500'}`}>
              <p className="text-sm font-semibold">
                Storage: {stats.used.toFixed(2)}MB / {stats.quota}MB ({diskPercentage}%)
              </p>
              <div className="w-48 h-2 bg-blue-300 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full transition-all ${diskWarning ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${diskPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Navigation() {
  const navigate = useNavigate();

  const links = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Download', icon: Download, path: '/downloader' },
    { label: 'Downloads', icon: List, path: '/downloads' },
    { label: 'Playlist', icon: Music, path: '/playlist' },
    { label: 'Settings', icon: Settings, path: '/settings' },
    { label: 'Help', icon: HelpCircle, path: '/help' }
  ];

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto py-4">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-sm">
          © 2026 YouTube Video Downloader | Backend by yt-dlp | Frontend built with React & Vite
        </p>
      </div>
    </footer>
  );
}

export function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <Navigation />
      <main className="flex-1 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
