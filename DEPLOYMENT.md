# ClipConvert Deployment Scripts
# ============================

## Option 1: Docker (Recommended)
# ============================
# On any VPS or local machine with Docker:
# docker-compose up -d --build
# Then visit: http://localhost:3000

## Option 2: Railway
# ============================
# 1. Go to railway.app and create a new project
# 2. Connect your GitHub repository
# 3. Add a MySQL or PostgreSQL database addon
# 4. Set environment variables in Railway dashboard:
#    - PORT=3000
#    - DB_PATH=./clipconvert.db
#    - MAX_UPLOAD_SIZE=524288000
#    - MAX_VIDEO_DURATION=7200
# 5. Railway automatically installs FFmpeg
# 6. Deploy!

## Option 3: Render.com
# ============================
# 1. Go to render.com and create a new Web Service
# 2. Connect GitHub repository
# 3. Build command: npm run build
# 4. Start command: npm start
# 5. Environment variables (same as above)
# 6. Add a Dockerfile for FFmpeg support:
#    - Use the Dockerfile provided
#    - Or use Render's private module support

## Option 4: Vercel (Frontend Only + Serverless)
# ============================
# Note: FFmpeg and SQLite won't work in serverless.
# For Vercel, you'd need to:
# 1. Deploy frontend to Vercel
# 2. Use a separate backend service (Railway, Render)
# 3. Or use Vercel's Edge Functions with WASM FFmpeg
# 4. Or use Vercel Blob Storage for files
# 
# See: https://vercel.com/docs

## Option 5: Self-Hosted VPS
# ============================
# 1. Get a VPS (DigitalOcean, Linode, AWS EC2)
# 2. Install Docker and Docker Compose
# 3. Clone this repository
# 4. Run: docker-compose up -d --build
# 5. Set up Nginx as reverse proxy with SSL:
#    - Use Certbot for free SSL certificates
# 6. Done!

## Quick Start (Any Platform)
# ============================
# Local development:
#   npm install
#   npm run dev
#
# Production build:
#   npm run build
#   npm start
#
# Docker production:
#   docker-compose up -d --build
#
# Verify deployment:
#   curl http://localhost:3000/api/health
