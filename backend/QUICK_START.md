# 🚀 Quick Start Guide

## Setup (5 minutes)

```bash
# 1. Navigate to backend folder
cd "C:\Users\PC\Desktop\youtube video downloader\backend"

# 2. Install dependencies (already done!)
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env if needed (optional - defaults are fine)

# 4. Start the server
npm run dev
```

Server will start on `http://localhost:3000`

---

## Test the API

### 1. Check Health
```bash
curl http://localhost:3000/health
```

### 2. Get Video Info
```bash
curl "http://localhost:3000/api/youtube/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### 3. Get Available Formats
```bash
curl "http://localhost:3000/api/youtube/formats?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### 4. Start a Download
```bash
curl "http://localhost:3000/api/youtube/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&format=720p"
```

This returns a `jobId`. Use it to track progress:

### 5. Monitor Progress
```bash
# In another terminal, stream progress updates
curl "http://localhost:3000/api/youtube/progress/YOUR_JOB_ID"
```

### 6. Cancel a Download
```bash
curl -X POST "http://localhost:3000/api/youtube/cancel/YOUR_JOB_ID"
```

### 7. Check Disk Usage
```bash
curl "http://localhost:3000/api/youtube/disk-stats"
```

---

## 📚 Full Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - All features explained
- **[COMPLETION_CHECKLIST.md](COMPLETION_CHECKLIST.md)** - What was implemented

---

## 🔧 Configuration

Edit `.env` file to customize:

```bash
# Server port
PORT=3000

# Max disk space (in MB)
MAX_DISK_SPACE_MB=5000
```

All rate limits are configured in [src/config.js](src/config.js)

---

## 📂 Project Structure

```
backend/
├── src/
│   ├── app.js                      ← Main Express app
│   ├── controllers/
│   │   └── youtube.controller.js   ← Request handlers
│   ├── routes/
│   │   └── youtube.routes.js       ← API routes
│   ├── services/
│   │   └── ytdlp.service.js        ← Download logic
│   └── utils/
│       ├── diskManager.js          ← 🆕 Disk quota
│       ├── cleanupScheduler.js     ← 🆕 Auto cleanup
│       ├── rateLimiter.js          ← 🆕 Rate limiting
│       ├── cancellationService.js  ← 🆕 Cancellation
│       ├── progressStore.js        ← Progress tracking
│       ├── validator.js            ← URL validation
│       └── zipper.js               ← ZIP creation
├── downloads/                       ← Downloaded files
├── server.js                        ← Entry point
├── package.json                     ← Dependencies
└── .env                             ← Configuration
```

---

## ✨ New Features

✅ **Format Filtering** - Smart quality selection
✅ **Disk Quota** - Automatic storage management  
✅ **Cleanup Scheduler** - Hourly automatic cleanup
✅ **Rate Limiting** - Protection against abuse
✅ **Download Cancellation** - Stop downloads anytime
✅ **Better Errors** - Helpful error messages
✅ **Progress Tracking** - Real-time updates

---

## 🐛 Bug Fixes

- ✅ Fixed controller methods
- ✅ Added proper error handling
- ✅ Better validation
- ✅ Faster progress updates
- ✅ Better resource cleanup

---

## 💡 Example: Complete Download Flow

```javascript
// 1. Get available formats
const formats = await fetch(
  'http://localhost:3000/api/youtube/formats?url=YOUR_URL'
).then(r => r.json());

// 2. Show formats to user - they pick one
const selectedFormat = formats.presets[0]; // e.g., "Best Quality"

// 3. Start download with selected format
const { jobId } = await fetch(
  `http://localhost:3000/api/youtube/download?url=YOUR_URL&format=${selectedFormat.format}`
).then(r => r.json());

// 4. Stream progress updates
const es = new EventSource(`http://localhost:3000/api/youtube/progress/${jobId}`);

es.onmessage = (event) => {
  const { progress, raw, done, error } = JSON.parse(event.data);
  
  if (progress) {
    console.log(`Progress: ${progress}%`);
  }
  
  if (error) {
    console.error('Download error:', error);
    es.close();
  }
  
  if (done) {
    console.log('✅ Download complete!');
    es.close();
  }
};

// 5. (Optional) Cancel download if needed
// await fetch(`http://localhost:3000/api/youtube/cancel/${jobId}`, { method: 'POST' });
```

---

## 🆘 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
# Change PORT in .env to 3001, etc
PORT=3001 npm run dev
```

### Downloads not starting
```bash
# Make sure yt-dlp is installed
yt-dlp --version

# Check disk space
curl http://localhost:3000/api/youtube/disk-stats

# Check logs in terminal
```

### Rate limit exceeded
```bash
# Wait the specified time or
# Check rate limit config in src/config.js
# Modify limits as needed
```

### Disk full
```bash
# Cleanup manually
curl http://localhost:3000/api/youtube/disk-stats

# Or increase quota in .env
MAX_DISK_SPACE_MB=10000
```

---

## 🎯 Next: Connect Frontend

Update your frontend to call these endpoints:

1. Fetch formats on URL enter
2. Show quality options to user
3. Start download on user selection
4. Stream progress with EventSource
5. Show Cancel button for active downloads
6. Display disk usage

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for all endpoint details.

---

## ✅ Status

- ✅ Backend complete
- ✅ All features implemented
- ✅ All bugs fixed
- ✅ Fully documented
- ✅ Ready for frontend integration

**Happy downloading! 🎉**
