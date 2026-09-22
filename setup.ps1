# ClipConvert Setup Script
# Run this script to set up ClipConvert on Windows

Write-Host "=== ClipConvert Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js found!" -ForegroundColor Green

# Check FFmpeg
Write-Host "Checking FFmpeg..." -ForegroundColor Yellow
ffmpeg -version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: FFmpeg is not installed. Please install FFmpeg and add it to PATH." -ForegroundColor Red
    Write-Host "  Windows: winget install Gyan.FFmpeg" -ForegroundColor Cyan
    Write-Host "  Or download from https://ffmpeg.org/download.html" -ForegroundColor Cyan
    exit 1
}
Write-Host "FFmpeg found!" -ForegroundColor Green

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies." -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed!" -ForegroundColor Green

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ".env file created!" -ForegroundColor Green
}

# Create necessary directories
$dirs = @("uploads", "output", "temp")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To build for production:" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Open http://localhost:3000 in your browser." -ForegroundColor Cyan
