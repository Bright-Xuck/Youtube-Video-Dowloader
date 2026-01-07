# 🚀 Deployment Checklist & Guide

## Pre-Deployment Verification

### Local Testing ✅
- [ ] Backend runs without errors: `npm run dev` in backend folder
- [ ] Frontend loads: `npm run dev` in youtube video downloader folder
- [ ] Can access http://localhost:5173 in browser
- [ ] Can fetch video info
- [ ] Can start a download
- [ ] Progress updates in real-time
- [ ] Can cancel a download
- [ ] Can download a playlist
- [ ] Settings save correctly
- [ ] Help page displays
- [ ] Mobile view is responsive
- [ ] No console errors (F12 → Console)
- [ ] No browser warnings

### Backend Verification ✅
- [ ] All dependencies installed: `npm install`
- [ ] Node.js version 16+ installed
- [ ] Port 3000 is available
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] Disk quota enforced
- [ ] Cleanup scheduler running
- [ ] Error messages are helpful
- [ ] Logs show proper timestamp format
- [ ] File permissions allow downloads/ creation

### Frontend Verification ✅
- [ ] All dependencies installed: `npm install`
- [ ] No TypeScript errors
- [ ] No ESLint warnings (optional: `npm run lint`)
- [ ] Build succeeds: `npm run build`
- [ ] dist/ folder created
- [ ] dist/ folder contains index.html
- [ ] Asset files are present
- [ ] No broken image links
- [ ] No 404 errors for assets

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

**Setup:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from youtube video downloader folder
cd "youtube video downloader"
vercel
```

**Configuration:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_BASE_URL": "@backend_url"
  }
}
```

**Environment Variables in Vercel Dashboard:**
- `VITE_API_BASE_URL`: `https://your-backend-url.com`

**Advantages:**
- ✅ Auto-deploys on git push
- ✅ Global CDN
- ✅ Edge functions
- ✅ Free tier available
- ✅ Easy preview URLs

---

### Option 2: Netlify

**Setup:**
```bash
# Build locally first
npm run build

# Deploy to Netlify
# Option A: Drag & drop dist/ folder to Netlify dashboard
# Option B: Connect GitHub account for auto-deploy
```

**Configuration File (netlify.toml):**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[env]
  VITE_API_BASE_URL = "https://your-backend-url.com"
```

**Environment Variables in Netlify:**
- `VITE_API_BASE_URL`: Your backend URL

---

### Option 3: Traditional Web Server

**Requirements:**
- Web server (Apache, Nginx, etc.)
- Static file hosting capability

**Steps:**
```bash
# Build the app
npm run build

# Copy dist folder to web server
# Example (Apache):
cp -r dist/* /var/www/html/

# Or (Nginx):
cp -r dist/* /usr/share/nginx/html/
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compress assets
    gzip on;
    gzip_types text/plain application/json text/css 
               application/javascript application/x-javascript;
}
```

**Apache Configuration (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Backend Deployment

### Option 1: Heroku

**Setup:**
```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Add Procfile to backend folder
echo "web: node server.js" > Procfile
```

**Deploy:**
```bash
# From backend folder
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

**Environment Variables:**
```bash
heroku config:set DOWNLOAD_QUOTA=5368709120
heroku config:set PORT=3000
```

---

### Option 2: Railway

**Setup:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy from backend folder
cd backend
railway up
```

**Configuration (railway.json):**
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm run dev",
    "restartPolicyMaxRetries": 5
  }
}
```

---

### Option 3: DigitalOcean (Droplet)

**Setup:**
```bash
# SSH into droplet
ssh root@your_droplet_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Clone repository
git clone https://github.com/your-repo.git
cd your-repo/backend

# Install dependencies
npm install

# Create .env file
nano .env
# Set PORT=3000, other variables
```

**Process Manager (PM2):**
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server.js --name "youtube-downloader"

# Enable auto-restart
pm2 startup
pm2 save

# View logs
pm2 logs youtube-downloader
```

**Nginx Reverse Proxy:**
```nginx
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Option 4: Docker Deployment

**Dockerfile (backend folder):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DOWNLOAD_QUOTA=5368709120
    volumes:
      - ./backend/downloads:/app/downloads
    restart: unless-stopped

  frontend:
    build: ./youtube\ video\ downloader
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:3000
    depends_on:
      - backend
    restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Free)

**Certbot (Nginx/Apache):**
```bash
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot certonly --nginx -d yourdomain.com

# Auto-renew
certbot renew --dry-run
```

**Nginx SSL Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Rest of configuration...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## DNS Configuration

### Frontend (Vercel)
```
A Record: yourdomain.com → [Vercel IP]
CNAME:    www → yourdomain.com
```

### Backend (DigitalOcean)
```
A Record: api.yourdomain.com → [Droplet IP]
```

---

## Environment Variables

### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_NAME=YouTube Downloader
```

### Backend (.env)
```env
PORT=3000
NODE_ENV=production
DOWNLOAD_QUOTA=5368709120
MAX_URL_LENGTH=1000
```

---

## Post-Deployment Testing

### Frontend Tests
- [ ] Site loads on custom domain
- [ ] All pages accessible
- [ ] Assets load correctly
- [ ] No CORS errors
- [ ] Mobile responsive
- [ ] Performance acceptable (<3s load)

### Backend Tests
- [ ] API accessible at correct endpoint
- [ ] Video info endpoint responds
- [ ] Download starts successfully
- [ ] Progress streaming works
- [ ] Cancellation works
- [ ] Rate limiting active
- [ ] Error handling works
- [ ] Logs show requests

### Integration Tests
- [ ] Frontend can reach backend
- [ ] Downloads save to disk
- [ ] Cleanup works on quota
- [ ] Progress updates received
- [ ] No console errors
- [ ] No API errors

---

## Monitoring & Maintenance

### Backend Logs
```bash
# View logs with PM2
pm2 logs youtube-downloader

# View specific lines
pm2 logs youtube-downloader | tail -100

# Save logs to file
pm2 logs youtube-downloader > app.log
```

### Database Backups
```bash
# Backup downloads folder
tar -czf downloads-backup.tar.gz backend/downloads/

# Restore
tar -xzf downloads-backup.tar.gz
```

### Performance Monitoring
- Set up Sentry for error tracking
- Use DataDog for monitoring
- Monitor disk space regularly
- Check memory usage

### Security Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
npm audit fix
```

---

## Troubleshooting Deployment

### Frontend not loading
- [ ] Check DNS resolution: `nslookup yourdomain.com`
- [ ] Check Vercel/Netlify dashboard
- [ ] View build logs for errors
- [ ] Check browser console (F12)
- [ ] Clear cache and hard refresh (Ctrl+Shift+R)

### Backend not responding
- [ ] SSH into server: `ssh user@backend.com`
- [ ] Check if running: `ps aux | grep node`
- [ ] View logs: `pm2 logs youtube-downloader`
- [ ] Check port: `netstat -tlnp | grep 3000`
- [ ] Restart: `pm2 restart youtube-downloader`

### CORS errors
- [ ] Check backend CORS configuration
- [ ] Verify frontend URL in CORS whitelist
- [ ] Check API_URL in frontend .env
- [ ] Restart both servers

### Downloads not working
- [ ] Check backend disk space: `df -h`
- [ ] Check downloads folder permissions: `ls -la backend/downloads/`
- [ ] Check logs for errors
- [ ] Verify yt-dlp installed: `python3 -m yt_dlp --version`

---

## Performance Optimization

### Frontend
```bash
# Build analysis
npm run build -- --analyze

# Reduce bundle size
# Use code splitting (automatic with Vite)
# Lazy load pages with React.lazy()
# Optimize images
# Enable gzip compression
```

### Backend
```javascript
// Add caching
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Compression
const compression = require('compression');
app.use(compression());
```

---

## Rollback Procedure

### Vercel
```bash
# View deployments
vercel ls

# Rollback to previous
vercel rollback
```

### Manual
```bash
# Keep previous version backup
cp -r dist dist-backup

# Restore from backup
cp -r dist-backup/* /var/www/html/
```

---

## Scaling Considerations

### As Traffic Grows
- [ ] Add load balancer (Nginx upstream)
- [ ] Multiple backend instances
- [ ] Redis for caching (optional)
- [ ] Database for history (optional)
- [ ] CDN for frontend (default with Vercel)

### Configuration
```nginx
upstream backend {
    server backend1.example.com:3000;
    server backend2.example.com:3000;
    server backend3.example.com:3000;
}
```

---

## Maintenance Schedule

### Daily
- Monitor error logs
- Check disk space
- Review API response times

### Weekly
- Update security patches
- Check rate limiting effectiveness
- Review user feedback

### Monthly
- Full system backup
- Update dependencies
- Performance analysis
- Cleanup old download files

---

## Disaster Recovery

### Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
tar -czf backup-$DATE.tar.gz backend/downloads/ .env
# Upload to S3 or cloud storage
```

### Recovery Procedure
1. Restore from backup
2. Verify data integrity
3. Test all functionality
4. Monitor for issues
5. Document incident

---

## Success Criteria

Your deployment is successful when:
- ✅ Frontend loads instantly on custom domain
- ✅ Can fetch video info from any public YouTube video
- ✅ Download starts and completes successfully
- ✅ Progress updates in real-time
- ✅ Can cancel downloads
- ✅ Settings save correctly
- ✅ No console errors
- ✅ Mobile view works perfectly
- ✅ Backend API responds to all endpoints
- ✅ Rate limiting prevents abuse

---

## Additional Resources

- **Vercel Deployment**: https://vercel.com/docs
- **Netlify Deployment**: https://docs.netlify.com
- **Heroku Deployment**: https://devcenter.heroku.com
- **Railway Deployment**: https://docs.railway.app
- **Docker**: https://docs.docker.com
- **Nginx**: https://nginx.org/en/docs
- **PM2**: https://pm2.keymetrics.io

---

## Support

For deployment issues:
1. Check the service's documentation
2. Review error logs carefully
3. Test locally first
4. Ask in their community forums
5. Contact provider support if needed

---

**Good luck with your deployment! 🚀**
