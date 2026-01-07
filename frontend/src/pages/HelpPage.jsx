import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'What video formats can I download?',
    answer: 'You can download videos in various formats including MP4, WebM, and more. The app automatically filters available formats based on your quality selection. You can choose from preset quality levels or manually select from all available formats.'
  },
  {
    question: 'What is the maximum video length I can download?',
    answer: 'There is no hard limit on video length, but very long videos (8+ hours) may take significant time to download depending on your internet speed and the selected quality. We recommend using a wired connection for very long downloads.'
  },
  {
    question: 'Can I download entire playlists?',
    answer: 'Yes! Use the "Download Playlist" page to download entire playlists. All videos will be downloaded and packaged into a single ZIP file for easy transfer and organization.'
  },
  {
    question: 'What happens if my download gets interrupted?',
    answer: 'Downloads are stored in the server with unique IDs. If a download is interrupted, you can restart it from the "Active Downloads" page. The server will track the progress and resume from where it left off.'
  },
  {
    question: 'How much storage space is available?',
    answer: 'The server has a 5GB download quota. When this quota is exceeded, the oldest files are automatically deleted to make space for new downloads. You can check your current disk usage from the header.'
  },
  {
    question: 'Can I download age-restricted videos?',
    answer: 'The downloader will attempt to download age-restricted videos, but this may not always work if YouTube implements additional protections. Verify that you have the proper access rights before downloading such content.'
  },
  {
    question: 'What is a "cancellation token" or download job ID?',
    answer: 'Each download is assigned a unique job ID that allows you to track and cancel it. These IDs are automatically generated and stored server-side. You can use them to cancel downloads from any page.'
  },
  {
    question: 'Why do I see rate limit messages?',
    answer: 'The app has built-in rate limiting to prevent abuse: 30 requests per hour (general), 10 downloads per hour, 5 playlists per day, 20 info fetches per minute. These limits reset automatically and are designed to prevent overload.'
  },
  {
    question: 'How do I report issues or get help?',
    answer: 'Check the troubleshooting section below. If your issue persists, check the browser console (F12) for error messages and ensure the backend server is running on port 3000.'
  },
  {
    question: 'Is my data private and secure?',
    answer: 'Downloads are stored temporarily on the server. Videos are automatically deleted based on age and disk quota. Do not download copyrighted content without proper authorization. Always respect copyright laws and YouTube\'s terms of service.'
  }
];

const TROUBLESHOOTING_ITEMS = [
  {
    issue: 'Backend server not responding',
    solution: 'Ensure the Node.js backend is running with `npm run dev` from the backend folder. Check that port 3000 is not blocked by a firewall.'
  },
  {
    issue: 'Cannot find video information',
    solution: 'Some videos may be private, deleted, or region-restricted. Try a different video. If using a proxy, temporarily disable it and try again.'
  },
  {
    issue: 'Download fails with "Signature extraction failed"',
    solution: 'This can happen when YouTube updates its protection mechanisms. Wait a few hours for yt-dlp to update automatically, or restart the backend server.'
  },
  {
    issue: 'Download progress not updating',
    solution: 'Refresh the page and check the "Active Downloads" section. The server continues downloading in the background even if the page is not updated.'
  },
  {
    issue: 'Disk quota exceeded - cannot download',
    solution: 'The server has reached its 5GB limit. Old downloads are automatically deleted, but this may take a few minutes. Try again shortly or delete old downloads manually.'
  },
  {
    issue: 'ZIP file download not starting',
    solution: 'Check your browser\'s download settings. Some browsers block automatic downloads. Try right-clicking the download button and selecting "Save as...".'
  },
  {
    issue: 'Rate limit error after many requests',
    solution: 'You\'ve exceeded the rate limits. Wait for the limits to reset (typically within an hour) before making more requests.'
  },
  {
    issue: 'Browser console shows CORS errors',
    solution: 'Ensure the frontend and backend are on the same network. Check that CORS is properly configured in the backend server.js file.'
  }
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border border-gray-300 rounded-lg mb-2">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
}

export function HelpPage() {
  const [openItems, setOpenItems] = useState({});
  const [openTroubleshooting, setOpenTroubleshooting] = useState({});

  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleTroubleshooting = (index) => {
    setOpenTroubleshooting(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <HelpCircle className="w-8 h-8" />
          Help & FAQ
        </h1>
        <p className="text-gray-600 mb-8">Find answers to common questions and troubleshooting tips</p>

        {/* Quick Start Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold flex-shrink-0">1</span>
                <div>
                  <p className="font-semibold">Go to the Download Page</p>
                  <p className="text-gray-600 text-sm">Click "Download" in the navigation menu</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold flex-shrink-0">2</span>
                <div>
                  <p className="font-semibold">Enter YouTube Video URL</p>
                  <p className="text-gray-600 text-sm">Paste a full YouTube video link</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold flex-shrink-0">3</span>
                <div>
                  <p className="font-semibold">Click "Fetch Info"</p>
                  <p className="text-gray-600 text-sm">The app will load video details and available qualities</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold flex-shrink-0">4</span>
                <div>
                  <p className="font-semibold">Select Quality and Download</p>
                  <p className="text-gray-600 text-sm">Choose a preset or select a specific format, then click Download</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold flex-shrink-0">5</span>
                <div>
                  <p className="font-semibold">Monitor Progress</p>
                  <p className="text-gray-600 text-sm">Watch the progress bar or go to "Active Downloads" page</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openItems[index]}
                onToggle={() => toggleItem(index)}
              />
            ))}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Troubleshooting</h2>
          <div className="space-y-2">
            {TROUBLESHOOTING_ITEMS.map((item, index) => (
              <div key={index} className="border border-red-300 rounded-lg mb-2">
                <button
                  onClick={() => toggleTroubleshooting(index)}
                  className="w-full px-4 py-3 flex justify-between items-center hover:bg-red-50 transition-colors text-left"
                >
                  <span className="font-semibold text-red-900">❌ {item.issue}</span>
                  {openTroubleshooting[index] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openTroubleshooting[index] && (
                  <div className="px-4 py-3 border-t border-red-300 bg-red-50">
                    <p className="text-red-900"><strong>Solution:</strong> {item.solution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Additional Resources */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-gray-900 mb-2">Documentation</h3>
              <p className="text-gray-600 text-sm mb-3">Detailed information about all features and how to use them.</p>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">Read Docs →</a>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-gray-900 mb-2">Settings Guide</h3>
              <p className="text-gray-600 text-sm mb-3">Learn how to customize your download preferences and interface settings.</p>
              <a href="/settings" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">Go to Settings →</a>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-gray-900 mb-2">GitHub Repository</h3>
              <p className="text-gray-600 text-sm mb-3">View the source code and contribute to the project.</p>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">Visit GitHub →</a>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-gray-900 mb-2">Report a Bug</h3>
              <p className="text-gray-600 text-sm mb-3">Found an issue? Let us know so we can fix it.</p>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">Report Issue →</a>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-yellow-900 mb-2">⚠️ Important Notice</h3>
          <p className="text-yellow-800 text-sm mb-3">
            This tool is provided for personal use and educational purposes. Users are responsible for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
            <li>Ensuring they have the right to download content</li>
            <li>Respecting copyright and YouTube's Terms of Service</li>
            <li>Not redistributing downloaded content without permission</li>
            <li>Complying with local laws and regulations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
