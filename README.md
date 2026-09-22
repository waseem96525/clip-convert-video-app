# ClipConvert

A professional video-to-audio clip maker built with Next.js, TypeScript, and FFmpeg.

## Deployment Options

### ⚠️ Important: Vercel Limitations

Vercel's serverless functions **do not support** FFmpeg or SQLite (native modules). For full functionality, use Docker/Railway/Render.

| Platform | FFmpeg | SQLite | File System | Recommended |
|----------|--------|--------|-------------|-------------|
| **Docker VPS** | ✅ | ✅ | ✅ | ⭐ Best |
| **Railway** | ✅ | ✅ | ✅ | ⭐ Easy |
| **Render** | ✅ | ✅ | ✅ | ⭐ Easy |
| **Vercel** | ❌ | ❌ | ❌ | Frontend only |
| **Fly.io** | ✅ | ✅ | ✅ | Good |

### Option 1: Docker (Recommended)

```bash
# Build and run
docker-compose up -d --build

# Then visit http://localhost:3000
```

### Option 2: Railway (Easiest)

```bash
# 1. Go to railway.app
# 2. Create new project, connect GitHub
# 3. Add environment variables
# 4. Railway auto-detects Node.js and installs FFmpeg
```

### Option 3: Vercel (Frontend Only)

For Vercel, you need to modify the approach:
- Frontend deploys normally
- Backend needs to be separate (Railway/Render)
- Or use Vercel's Edge Runtime with WASM FFmpeg

### Option 4: Self-Hosted VPS

```bash
# On Ubuntu/Debian VPS:
sudo apt update && sudo apt install -y nodejs npm docker.io docker-compose
git clone <your-repo>
cd clipconvert
docker-compose up -d --build

# Set up Nginx + SSL:
sudo apt install -y certbot python3-certbot-nginx
# Configure nginx as reverse proxy, then:
sudo certbot --nginx -d yourdomain.com
```

## Quick Start (Local Development)

### Prerequisites

- **Node.js** 18+
- **FFmpeg** 4.0+
- **npm**

### Installation

```bash
cd clipconvert
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Setup Script (Windows)

```powershell
.\setup.ps1
```

## GitHub Deployment Steps

### For Vercel:
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → "Add New Project"
3. Import your repository
4. Build command: `npm run build`, Start: `npm start`
5. ⚠️ Note: FFmpeg won't work on Vercel free tier

### For Railway:
1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → "New Project" → "Deploy from GitHub"
3. Select repository
4. Add environment variables in dashboard
5. Deploy automatically on every push

### For Docker Deployment:
```bash
git clone <repo-url>
cd clipconvert
docker-compose up -d --build
```

## Project Structure

```
clipconvert/
├── src/app/                    # Next.js App Router
│   ├── api/                   # API routes
│   │   ├── upload/            # File upload
│   │   ├── url/               # URL processing
│   │   ├── process/           # Clip processing
│   │   ├── clip/              # Clip management
│   │   ├── download/          # Download endpoint
│   │   └── health/            # Health check
│   ├── components/            # React components
│   │   ├── Navbar.tsx
│   │   ├── UploadArea.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── Timeline.tsx
│   │   ├── AudioSettingsPanel.tsx
│   │   └── ClipList.tsx
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Library functions
│   └── app/                   # Page routes
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose
├── public/                    # Static assets
├── uploads/                   # Uploaded videos
├── output/                    # Generated audio
├── .env.example               # Environment template
├── .gitignore
├── setup.ps1                  # Windows setup script
├── DEPLOYMENT.md              # Deployment guide
├── README.md
└── package.json
```

## Usage

### Upload a Video
1. Click **Upload File** tab
2. Drag & drop or browse for a video file
3. Supported formats: MP4, WebM, MOV, AVI, MKV, M4V
4. Max file size: 500MB, Max duration: 2 hours

### Paste a Video URL
1. Click **Video URL** tab
2. Enter a publicly accessible URL
3. Only use URLs where you have permission to download
4. Click **Fetch Video**

### Create an Audio Clip
1. Video loads in the player
2. Use the timeline to select start/end points
3. Keyboard shortcuts: Space=Play/Pause, I=Set Start, O=Set End
4. Configure audio settings (format, bitrate, etc.)
5. Click **CREATE AUDIO CLIP**
6. Download the finished audio file

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause video |
| I | Set start time at current position |
| O | Set end time at current position |
| ← | Move backward 5 seconds |
| → | Move forward 5 seconds |

## Configuration

Edit `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_UPLOAD_SIZE` | 524288000 | Max upload size in bytes (500MB) |
| `MAX_VIDEO_DURATION` | 7200 | Max video duration in seconds (2h) |
| `MAX_CLIP_DURATION` | 1800 | Max clip duration in seconds (30min) |
| `FILE_CLEANUP_DAYS` | 1 | Days before temporary files deleted |
| `PORT` | 3000 | Server port |

## Security

- SSRF protection (no private network URLs)
- File type and size validation
- Temporary files automatically cleaned up after 24 hours
- No arbitrary command execution
- Filename sanitization
- Private IP blocking for URLs

## License

MIT License
