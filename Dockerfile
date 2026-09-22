FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Create upload/output directories
RUN mkdir -p uploads output temp

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start
CMD ["npm", "start"]
