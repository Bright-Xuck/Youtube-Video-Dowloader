const rateLimit = require("express-rate-limit");

// Using memory store by default (no Redis dependency)
// Can be upgraded to Redis for production later

const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks, localhost, and viewing active downloads
      const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost';
      return req.path === "/health" || 
             req.path === "/api/youtube/downloads" ||
             isLocalhost;
    }
  });
};

// Limit: 30 requests per hour per IP
exports.generalLimiter = createLimiter(
  60 * 60 * 1000,
  30,
  "Too many requests, please try again later"
);

// Limit: 50 download requests per hour per IP (increased for better UX)
exports.downloadLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  "Too many downloads, please wait before requesting another download"
);

// Limit: 5 playlist downloads per day per IP
exports.playlistLimiter = createLimiter(
  24 * 60 * 60 * 1000,
  5,
  "Too many playlist downloads, try again tomorrow"
);

// Limit: 20 info/format requests per minute per IP
exports.infoLimiter = createLimiter(
  60 * 1000,
  20,
  "Too many requests for video information"
);

/**
 * Advanced rate limiter with custom logic
 */
exports.createCustomLimiter = (windowMs, max, keyGenerator) => {
  const store = new Map();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const window = store.get(key) || { count: 0, reset: now + windowMs };

    if (now > window.reset) {
      window.count = 1;
      window.reset = now + windowMs;
    } else {
      window.count++;
    }

    store.set(key, window);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - window.count));
    res.setHeader("X-RateLimit-Reset", new Date(window.reset).toISOString());

    if (window.count > max) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((window.reset - now) / 1000)
      });
    }

    next();
  };
};

// Detect and block suspicious patterns
exports.abuseDetectionMiddleware = (req, res, next) => {
  // Check for suspicious URL patterns
  const url = req.query.url || "";
  
  // Block requests with too many URL parameters
  if (url.length > 1000) {
    return res.status(400).json({ error: "URL too long" });
  }

  // Check for repeated suspicious patterns
  if (url.match(/[<>"%{}\\\^`]/g)) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  next();
};
