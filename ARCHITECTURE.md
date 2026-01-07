# System Architecture

## Frontend & Backend Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (http://localhost:5173)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Application                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              React Router (v7)                       │ │  │
│  │  │  Routes: / | /downloader | /downloads | /playlist  │ │  │
│  │  │           | /settings | /help                       │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                          ↓                                │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              Layout Component                        │ │  │
│  │  │  ┌──────────────────────────────────────────────┐  │ │  │
│  │  │  │  Header (Disk Usage, Navigation)            │  │ │  │
│  │  │  └──────────────────────────────────────────────┘  │ │  │
│  │  │  ┌──────────────────────────────────────────────┐  │ │  │
│  │  │  │  Page Content (Home/Download/etc)           │  │ │  │
│  │  │  └──────────────────────────────────────────────┘  │ │  │
│  │  │  ┌──────────────────────────────────────────────┐  │ │  │
│  │  │  │  Footer                                       │  │ │  │
│  │  │  └──────────────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                          ↓                                │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │          Custom Hooks (useApi.js)                   │ │  │
│  │  │  ├─ useProgressStream()    → SSE listener           │ │  │
│  │  │  ├─ useVideoInfo()         → Fetch metadata         │ │  │
│  │  │  ├─ useFormats()           → Get formats            │ │  │
│  │  │  ├─ useDiskStats()         → Auto-poll disk         │ │  │
│  │  │  └─ useActiveDownloads()   → Auto-poll downloads    │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                          ↓                                │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │       API Client (services/api.js)                   │ │  │
│  │  │                                                        │ │  │
│  │  │  Methods:                                             │ │  │
│  │  │  ├─ getVideoInfo(url)                                │ │  │
│  │  │  ├─ getFormats(url)                                  │ │  │
│  │  │  ├─ startDownload(url, format)                       │ │  │
│  │  │  ├─ streamProgress(jobId)          [SSE]             │ │  │
│  │  │  ├─ getProgress(jobId)             [Polling]         │ │  │
│  │  │  ├─ cancelDownload(jobId)                            │ │  │
│  │  │  ├─ getActiveDownloads()                             │ │  │
│  │  │  ├─ getDiskStats()                                   │ │  │
│  │  │  ├─ downloadPlaylistZip(url)                         │ │  │
│  │  │  └─ healthCheck()                                    │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                          ↓                                │  │
│  │              HTTP/SSE (Axios)                             │  │
│  │          Over Network (localhost)                         │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────────────────────────────┐
         │  Network Request/SSE Stream             │
         │  http://localhost:3000/api/youtube      │
         └──────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js on port 3000)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Express Server (app.js)                         │  │
│  │  ├─ CORS Middleware                                       │  │
│  │  ├─ Rate Limiter Middleware                              │  │
│  │  ├─ Error Handler Middleware                             │  │
│  │  └─ Cleanup Scheduler Startup                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Routes (youtube.routes.js)                   │  │
│  │  GET  /info              →  youtube.controller            │  │
│  │  GET  /formats           →  youtube.controller            │  │
│  │  POST /download          →  youtube.controller            │  │
│  │  GET  /progress/:jobId   →  youtube.controller (SSE)      │  │
│  │  POST /cancel/:jobId     →  youtube.controller            │  │
│  │  GET  /active            →  youtube.controller            │  │
│  │  GET  /disk-stats        →  youtube.controller            │  │
│  │  POST /playlist-zip      →  youtube.controller            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Controllers (youtube.controller.js)               │  │
│  │  ├─ getVideoInfo()          [calls ytdlp.service]        │  │
│  │  ├─ getFormats()            [calls ytdlp.service]        │  │
│  │  ├─ startDownload()         [creates job, streams SSE]   │  │
│  │  ├─ streamProgress()        [Server-Sent Events]         │  │
│  │  ├─ cancelDownloadJob()     [calls cancellationService]  │  │
│  │  ├─ getActiveDownloads()    [checks progressStore]       │  │
│  │  ├─ getDiskUsage()          [calls diskManager]          │  │
│  │  └─ downloadPlaylistZip()   [calls zipper utility]       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Services (ytdlp.service.js)                      │  │
│  │  ├─ getInfo(url)                                          │  │
│  │  │  └─ Uses: yt-dlp-wrap library                          │  │
│  │  │                                                         │  │
│  │  ├─ getAllFormats(url)                                    │  │
│  │  │  └─ Returns all 50+ format options                     │  │
│  │  │                                                         │  │
│  │  ├─ getFormats(url, preset)                              │  │
│  │  │  ├─ Filters formats by quality preset                 │  │
│  │  │  └─ Returns best 20 options                            │  │
│  │  │                                                         │  │
│  │  ├─ downloadWithProgress(url, format, cancelToken)       │  │
│  │  │  ├─ Uses cancellationService for token mgmt           │  │
│  │  │  ├─ Streams progress to progressStore                 │  │
│  │  │  ├─ Streams progress to diskManager                   │  │
│  │  │  ├─ Handles errors w/ fallbacks                       │  │
│  │  │  └─ Returns filesize & filename                        │  │
│  │  │                                                         │  │
│  │  └─ downloadPlaylist(url, options)                        │  │
│  │     └─ Downloads all videos in playlist                   │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Utilities                                    │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  progressStore.js                                 │  │  │
│  │  │  ├─ In-memory progress tracking                   │  │  │
│  │  │  ├─ getProgress(jobId)                            │  │  │
│  │  │  ├─ updateProgress(jobId, data)                   │  │  │
│  │  │  └─ removeProgress(jobId)                         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  cancellationService.js                           │  │  │
│  │  │  ├─ createCancellationToken()                      │  │  │
│  │  │  ├─ cancelDownload(jobId)    [kills process]      │  │  │
│  │  │  ├─ attachProcess(jobId, process)                 │  │  │
│  │  │  ├─ isCancelled(jobId)                            │  │  │
│  │  │  └─ cleanup()               [auto after 1 hour]   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  diskManager.js                                   │  │  │
│  │  │  ├─ getCurrentDiskUsage()                          │  │  │
│  │  │  ├─ isDiskQuotaExceeded()                         │  │  │
│  │  │  ├─ getAvailableDiskSpace()                       │  │  │
│  │  │  ├─ cleanupOldFiles()      [oldest first]         │  │  │
│  │  │  ├─ getDiskStats()                                │  │  │
│  │  │  └─ Tracks: 5GB quota                             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  cleanupScheduler.js                              │  │  │
│  │  │  ├─ Hourly check        (0 * * * *)              │  │  │
│  │  │  ├─ 5-min quota check   (*/5 * * * *)            │  │  │
│  │  │  ├─ Triggers diskManager cleanup                 │  │  │
│  │  │  ├─ Removes old tokens                            │  │  │
│  │  │  └─ Uses: node-cron                               │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  rateLimiter.js                                   │  │  │
│  │  │  ├─ General: 30/hour                              │  │  │
│  │  │  ├─ Downloads: 10/hour                            │  │  │
│  │  │  ├─ Playlists: 5/day                              │  │  │
│  │  │  ├─ Info: 20/min                                  │  │  │
│  │  │  └─ Uses: express-rate-limit (memory store)       │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  zipper.js                                        │  │  │
│  │  │  ├─ createPlaylistZip(files)                      │  │  │
│  │  │  └─ Uses: archiver library                        │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  validator.js                                     │  │  │
│  │  │  ├─ validateUrl(url)                              │  │  │
│  │  │  ├─ sanitizeFilename(name)                        │  │  │
│  │  │  └─ validateFormat(format)                        │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            File System Storage                           │  │
│  │                                                            │  │
│  │  downloads/                                              │  │
│  │  ├─ Video files (.mp4, .webm, etc)                      │  │
│  │  ├─ playlist-{id}/                                       │  │
│  │  │  ├─ Multiple video files                             │  │
│  │  │  └─ playlist.zip                                      │  │
│  │  │                                                        │  │
│  │  └─ Auto-deleted when quota exceeded                     │  │
│  │     (oldest files first)                                 │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Downloading a Video

```
User Action
    ↓
[Enter URL] → [Fetch Info]
    ↓
Browser → API GET /info
    ↓
Backend getVideoInfo() → yt-dlp → YouTube
    ↓
Response: {title, thumbnail, duration, uploader, views}
    ↓
[Display Video Info & Formats]
    ↓
[Select Quality] → [Download]
    ↓
Browser → API POST /download
    ↓
Backend startDownload()
    ├─ Create jobId (uuid)
    ├─ Validate URL & format
    ├─ Check disk quota
    ├─ Start download process
    ├─ Register in progressStore
    ├─ Return jobId + SSE stream URL
    └─ Start yt-dlp process
    ↓
Browser SSE /progress/{jobId}
    ↓
Backend streams progress
    ├─ % complete
    ├─ Speed
    ├─ ETA
    ├─ File info
    └─ Updates progressStore
    ↓
[Update Progress Bar] ← Every 1-2 seconds
    ↓
Download Complete
    ↓
progressStore removes jobId
    ↓
File saved to downloads/
```

## Quality Selection Flow

```
User enters URL
    ↓
frontend getFormats(url) →yt-dlp getAllFormats
    ↓
Backend returns ~50 formats with:
├─ Resolution (720p, 1080p, etc)
├─ Codec (h264, vp9, etc)
├─ FPS
├─ File size estimate
└─ Format ID
    ↓
Frontend filters by preset:
├─ Best        → Highest resolution available
├─ 1080p       → best[height≤1080]
├─ 720p        → best[height≤720] ← DEFAULT
├─ 480p        → best[height≤480]
└─ Smallest    → Lowest file size
    ↓
User selects quality
    ↓
Backend receives {url, format}
    ↓
yt-dlp downloads with selected format
    ↓
File saved to downloads/
```

## Playlist Download Flow

```
User enters Playlist URL
    ↓
frontend getVideoInfo(playlistUrl) → yt-dlp
    ↓
Backend returns playlist metadata
├─ Playlist name
├─ Video count
├─ Thumbnail
└─ Description
    ↓
[Display Playlist Info]
    ↓
[Download as ZIP]
    ↓
Browser → API POST /playlist-zip
    ↓
Backend downloadPlaylist()
    ├─ Extract all video URLs
    ├─ Download each video
    │  ├─ Check disk quota before each
    │  ├─ Use quality preset
    │  ├─ Update progress
    │  └─ Handle errors (skip if fail)
    ├─ Collect all downloaded files
    ├─ Call zipper.createPlaylistZip()
    │  └─ Uses archiver library
    ├─ Return zip file as blob
    └─ Browser auto-downloads ZIP
    ↓
User receives: playlist-{timestamp}.zip
```

## Rate Limiting Strategy

```
Client Request
    ↓
Middleware: rateLimiter
    ├─ Check request type (info/download/playlist/general)
    ├─ Get client IP
    ├─ Check memory store for limits
    │  ├─ General: 30 requests/hour
    │  ├─ Download: 10/hour
    │  ├─ Playlist: 5/day
    │  └─ Info: 20/min
    ├─ Increment counter
    ├─ If exceeded: Return 429 Too Many Requests
    └─ If OK: Continue to controller
```

## Error Handling Flow

```
Any Backend Operation
    ↓
Try-Catch Block
    ├─ Validation Error
    │  └─ Return 400 Bad Request
    ├─ Authentication Error
    │  └─ Return 401 Unauthorized
    ├─ Rate Limit Error
    │  └─ Return 429 Too Many Requests
    ├─ Not Found Error
    │  └─ Return 404 Not Found
    ├─ Disk Quota Error
    │  └─ Trigger diskManager.cleanupOldFiles()
    │     └─ Retry
    ├─ yt-dlp Error
    │  ├─ Age-restricted?
    │  ├─ Private video?
    │  ├─ Region-restricted?
    │  ├─ Signature extraction failed?
    │  └─ Return helpful message
    └─ Server Error
       └─ Return 500 with logged error
           ↓
           Log to console with timestamp
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│      User's Browser (Any Device)        │
└─────────────────────────────────────────┘
              ↓
    https://yourdomain.com
              ↓
┌─────────────────────────────────────────┐
│   CDN (Vercel/Netlify) - Serves React   │
│   • Static files (HTML, CSS, JS)        │
│   • Global edge locations               │
│   • Auto-deploys on git push            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Backend Server (Heroku/Railway/VPS)    │
│  • Node.js running on port 3000         │
│  • Environment variables                │
│  • Persistent storage (downloads/)      │
│  • Logs and monitoring                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  YouTube API (External)                 │
│  • yt-dlp wrapper                       │
│  • Video metadata & formats             │
└─────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Separation of concerns
- ✅ Scalable component design
- ✅ Real-time progress updates
- ✅ Robust error handling
- ✅ Rate limiting protection
- ✅ Automatic cleanup
- ✅ Responsive UI
- ✅ Production-ready code
