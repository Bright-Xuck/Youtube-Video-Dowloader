# YouTube Video Downloader - Backend API Documentation

## Features

✅ **Video Information Extraction** - Get metadata about YouTube videos
✅ **Format Filtering** - Display only valid qualities with proper formatting
✅ **Download with Progress Tracking** - Real-time SSE progress updates
✅ **Playlist Downloads** - Download entire playlists as ZIP files
✅ **Download Cancellation** - Cancel ongoing downloads
✅ **Disk Quota Management** - Automatic cleanup when storage limit reached
✅ **Cleanup Scheduler** - Hourly automatic cleanup of old files
✅ **Rate Limiting & Abuse Protection** - Protect against abuse
✅ **Active Downloads Tracking** - Monitor all ongoing downloads

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

## Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
node server.js
```

---

## API Endpoints

### 1. Get Video Information
**GET** `/api/youtube/info`

Get metadata about a YouTube video.

**Query Parameters:**
- `url` (required) - YouTube video URL

**Example:**
```bash
curl "http://localhost:3000/api/youtube/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**Response:**
```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "duration": 212,
  "uploader": "Rick Astley",
  "formats": [...]
}
```

---

### 2. Get Available Formats (Filtered)
**GET** `/api/youtube/formats`

Get available video formats and quality presets.

**Query Parameters:**
- `url` (required) - YouTube video URL

**Example:**
```bash
curl "http://localhost:3000/api/youtube/formats?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**Response:**
```json
{
  "presets": [
    {
      "id": "best",
      "label": "Best Quality (best video + best audio)",
      "format": "bv*+ba/b"
    },
    {
      "id": "720p",
      "label": "720p HD",
      "format": "bestvideo[height<=720]+bestaudio/best[height<=720]"
    },
    {
      "id": "480p",
      "label": "480p",
      "format": "bestvideo[height<=480]+bestaudio/best[height<=480]"
    },
    {
      "id": "360p",
      "label": "360p (Low bandwidth)",
      "format": "bestvideo[height<=360]+bestaudio/best[height<=360]"
    },
    {
      "id": "audio",
      "label": "Audio Only (MP3)",
      "format": "bestaudio"
    }
  ],
  "formats": [
    {
      "format_id": "22",
      "format": "22 - 1280x720 (mp4)",
      "resolution": "720",
      "fps": 30,
      "vcodec": "h.264",
      "acodec": "aac",
      "filesizetitle": "45.25 MiB"
    }
  ]
}
```

---

### 3. Start Download
**GET** `/api/youtube/download`

Start downloading a video.

**Query Parameters:**
- `url` (required) - YouTube video URL
- `format` (optional) - Format ID or preset. Defaults to "bv*+ba/b" (best quality)
- `playlist` (optional) - "true" to download entire playlist

**Example:**
```bash
curl "http://localhost:3000/api/youtube/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&format=22"
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Download started",
  "progressUrl": "/api/youtube/progress/550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 4. Stream Download Progress (SSE)
**GET** `/api/youtube/progress/:jobId`

Get real-time download progress using Server-Sent Events.

**Example (JavaScript):**
```javascript
const eventSource = new EventSource('/api/youtube/progress/550e8400-e29b-41d4-a716-446655440000');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}%`);
  console.log(data.raw);
  
  if (data.done) {
    eventSource.close();
    console.log('Download complete!');
  }
  
  if (data.error) {
    eventSource.close();
    console.error('Download error:', data.error);
  }
};

eventSource.onerror = () => {
  eventSource.close();
};
```

**Response Format:**
```
data: {"progress":15,"raw":"[download]  15.2% of ..."}

data: {"progress":45,"raw":"[download]  45.6% of ..."}

data: {"progress":100,"done":true}
```

---

### 5. Cancel Download
**POST** `/api/youtube/cancel/:jobId`

Cancel an ongoing download.

**Example:**
```bash
curl -X POST "http://localhost:3000/api/youtube/cancel/550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "message": "Download cancelled successfully"
}
```

---

### 6. Get Active Downloads
**GET** `/api/youtube/downloads`

Get list of all active downloads.

**Example:**
```bash
curl "http://localhost:3000/api/youtube/downloads"
```

**Response:**
```json
{
  "downloads": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "cancelled": false,
      "createdAt": 1705190400000,
      "elapsed": 15000
    }
  ],
  "count": 1
}
```

---

### 7. Get Disk Statistics
**GET** `/api/youtube/disk-stats`

Get disk usage and quota information.

**Example:**
```bash
curl "http://localhost:3000/api/youtube/disk-stats"
```

**Response:**
```json
{
  "used": 2345.67,
  "available": 2654.33,
  "quota": 5000,
  "percentUsed": 46.91
}
```

---

### 8. Download Playlist as ZIP
**GET** `/api/youtube/playlist/zip`

Download entire playlist as a ZIP file.

**Query Parameters:**
- `url` (required) - YouTube playlist URL

**Example:**
```bash
curl "http://localhost:3000/api/youtube/playlist/zip?url=https://www.youtube.com/playlist?list=PLxxxxxx" \
  -o playlist.zip
```

**Response:** ZIP file download

---

### 9. Health Check
**GET** `/health`

Check if the server is running.

**Example:**
```bash
curl "http://localhost:3000/health"
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-07T12:34:56.789Z"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

| Endpoint Type | Limit | Window |
|---|---|---|
| General Endpoints | 30 requests | 1 hour |
| Info/Formats | 20 requests | 1 minute |
| Downloads | 10 requests | 1 hour |
| Playlists | 5 downloads | 24 hours |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2024-01-07T13:34:56.789Z
```

**When limit exceeded (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

---

## Disk Management

### Automatic Cleanup
- **Hourly Check**: Runs every hour to check disk usage
- **Threshold**: Cleanup triggers when usage > 80%
- **Aggressive Cleanup**: Triggers when quota is exceeded
- **Old Files First**: Removes oldest files first

### Environment Variables
```
MAX_DISK_SPACE_MB=5000          # Maximum disk space allowed (in MB)
```

### Cleanup Scheduler
- Runs every hour to check if cleanup is needed
- Automatically frees up space when threshold is exceeded
- Cleans up old download tokens after 1 hour

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details if available"
}
```

### Common Status Codes
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (invalid endpoint)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Directory Structure

```
backend/
├── src/
│   ├── app.js                      # Express app setup
│   ├── controllers/
│   │   └── youtube.controller.js   # Route handlers
│   ├── routes/
│   │   └── youtube.routes.js       # Route definitions
│   ├── services/
│   │   └── ytdlp.service.js        # Download logic
│   └── utils/
│       ├── validator.js            # URL validation
│       ├── progressStore.js        # Progress tracking
│       ├── zipper.js               # ZIP creation
│       ├── diskManager.js          # Disk quota management
│       ├── cleanupScheduler.js     # Scheduled cleanup
│       ├── cancellationService.js  # Download cancellation
│       └── rateLimiter.js          # Rate limiting
├── downloads/                       # Downloaded files storage
├── server.js                        # Entry point
├── package.json                     # Dependencies
└── .env                             # Configuration
```

---

## Features Implemented

### ✅ 1. Format Filtering (Show Only Valid Qualities)
- Filters formats to show only those with both video and audio
- Provides quality presets (Best, 720p, 480p, 360p, Audio Only)
- Returns sorted list by resolution (highest first)
- Shows file size information for each format

### ✅ 2. Disk Quota & Cleanup Scheduler
- Configurable disk space limit (default 5GB)
- Automatic hourly cleanup scheduler
- Removes oldest files first when cleanup triggered
- Aggressive cleanup when quota exceeded
- Real-time disk usage statistics
- Automatic cleanup of old download tokens

### ✅ 3. Rate Limiting & Abuse Protection
- General rate limit: 30 requests/hour per IP
- Download limit: 10 requests/hour per IP
- Playlist limit: 5 downloads/day per IP
- Info/Format limit: 20 requests/minute per IP
- Abuse detection middleware (prevents malformed URLs)
- Rate limit headers in responses

### ✅ 4. Download Cancellation
- Create cancellation token for each download
- Kill process when cancellation requested
- Clean up associated directories
- Auto-cleanup of old tokens after 1 hour
- Get active downloads list

### ✅ 5. Bug Fixes
- Fixed controller method naming (removed unused `download` method)
- Added proper error handling throughout
- Improved URL validation
- Better error messages and details
- Added missing null/undefined checks
- Proper SSE connection handling
- Better logging

---

## Usage Examples

### JavaScript/Fetch
```javascript
// Get video formats
const formats = await fetch('http://localhost:3000/api/youtube/formats?url=YOUTUBE_URL').then(r => r.json());

// Start download
const { jobId } = await fetch('http://localhost:3000/api/youtube/download?url=YOUTUBE_URL&format=22').then(r => r.json());

// Monitor progress
const eventSource = new EventSource(`/api/youtube/progress/${jobId}`);
eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
```

### cURL
```bash
# Get formats
curl "http://localhost:3000/api/youtube/formats?url=YOUTUBE_URL"

# Start download
curl "http://localhost:3000/api/youtube/download?url=YOUTUBE_URL"

# Cancel download
curl -X POST "http://localhost:3000/api/youtube/cancel/JOB_ID"

# Get disk stats
curl "http://localhost:3000/api/youtube/disk-stats"
```

---

## Troubleshooting

### Downloads not starting
- Check if yt-dlp is installed: `yt-dlp --version`
- Verify YouTube URL is valid
- Check disk space available
- Review server logs for error messages

### Rate limit exceeded
- Wait for the time specified in `Retry-After` header
- Implement exponential backoff in your client

### Disk space issues
- Check current usage: `GET /api/youtube/disk-stats`
- Manually download available playlist ZIP files
- Increase `MAX_DISK_SPACE_MB` in `.env`
- Scheduler will auto-cleanup old files when threshold reached

---

## License

ISC
