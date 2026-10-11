# Multi-stage production Dockerfile for DocFlow PDF Renderer Service
# Designed for Fly.io, Railway, Google Cloud Run, AWS ECS, or bare-metal VPS

FROM node:22-bookworm-slim AS base

# Install Chromium & international math fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-dejavu-core \
    ca-certificates \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

WORKDIR /app

# Copy root package.json and dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy shared LaTeX parser & styles, and PDF service source
COPY src/shared/ ./src/shared/
COPY pdf-service/ ./pdf-service/

WORKDIR /app/pdf-service

# Switch to non-root node user for security
USER node

EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--experimental-strip-types", "src/server.ts"]
