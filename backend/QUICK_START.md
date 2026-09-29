# 🚀 Quick Start Guide

## Setup (5 minutes)

```bash
# 1. Navigate to backend folder
cd "C:\Users\PC\Desktop\youtube video downloader\backend"

# 2. Install dependencies (if not already done)
npm install

# 3. Start the server
npm run dev
```

Server will start on `http://localhost:3000`

---

## 🎬 Browser-Based Video Downloads

**Videos end up on your computer** - the server only uses a small scratch file while a download is being prepared.

### Requirements
- **yt-dlp** on your PATH (keep it fresh: `yt-dlp -U`) - YouTube breaks regularly
- **ffmpeg** on your PATH - needed whenever video and audio have to be merged
- **A JavaScript runtime** for yt-dlp (Node 20+ works, Deno also works). The backend
  passes `--js-runtimes node` by default, see `YTDLP_JS_RUNTIME` in `.env.example`

### How It Works
1. **Frontend** asks the backend to download `GET /api/youtube/stream?url=…&format=…&jobId=…`
2. **Backend** asks yt-dlp which format that resolves to
   - one already-muxed stream (e.g. audio only) → **piped straight to the browser**
   - separate video + audio → **merged by ffmpeg into `downloads/.tmp/<jobId>/`**, then
     sent with an exact `Content-Length` so the browser can show real progress and
     support Pause/Resume (HTTP `Range`)
3. **Browser** saves the finished file to your Downloads folder
4. The scratch file is removed when the download completes, or automatically after
   `TEMP_FILE_TTL_MS` (10 minutes by default)

Progress is streamed live from `GET /api/youtube/progress/:jobId` (server sent events).

### Key Benefits
✅ No long-term server disk usage (scratch files expire)  
✅ Accurate progress + Pause/Resume via byte ranges  
✅ Clear error messages instead of a dead connection  
✅ No cleanup needed

### New Streaming Endpoint
```
GET /api/youtube/stream?url=<url>&format=<format>
```
Streams video directly to browser with real-time progress tracking

---

## 📊 Rate Limits & Quotas

Default limits to prevent abuse and ensure fair usage:

| Feature | Limit | Purpose |
|---------|-------|---------|
| General API Requests | 30/hour per IP | Prevent spam |
| Download Requests | 50/hour per IP | Protect server resources |
| Playlist Downloads | 5/day per IP | Prevent disk exhaustion |
| Video Info Requests | 20/minute per IP | Prevent abuse |

### Configuration
Edit `.env` file to customize:
```bash
# Server port
PORT=3000

# Max disk space (in MB)
MAX_DISK_SPACE_MB=5000
```

Rate limits are in `src/config.js` - modify the `rateLimits` object to change.

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

### 4. Stream Video to Browser
```bash
# Browser will download the video automatically
# Works for single videos AND playlists - same endpoint!
curl "http://localhost:3000/api/youtube/stream?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&format=best"
```

**That's it!** No complex download tracking needed. The browser handles pause/resume and automatically saves to Downloads folder.

---

## 📚 Full Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - All features explained
- **[COMPLETION_CHECKLIST.md](COMPLETION_CHECKLIST.md)** - What was implemented

---

## � Project Structure

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
│       ├── diskManager.js          ← Disk quota & cleanup
│       ├── cleanupScheduler.js     ← Auto cleanup timer
│       ├── rateLimiter.js          ← Rate limiting
│       ├── cancellationService.js  ← Stop downloads
│       ├── progressStore.js        ← Progress tracking
│       ├── validator.js            ← URL validation
│       └── zipper.js               ← ZIP creation
├── downloads/                       ← Downloaded files
├── server.js                        ← Entry point
├── package.json                     ← Dependencies
└── .env                             ← Configuration
```
# Check if port 3000 is in use
# Change PORT in .env to 3001, etc
PORT=3001 npm run dev
```

### Downloads not starting
```bash
# Make sure yt-dlp is installed
yt-dlp --version

# If yt-dlp is installed in a custom location, set the path before starting the backend
set YTDLP_BINARY=C:\path\to\yt-dlp.exe
npm run dev

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
