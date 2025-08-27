# Multi-stage Dockerfile for MedusaJS v2 - Aligned with Medusa Docs
# Build stage - compiles the application
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Create medusa user (uid 1001) - single user across build and runtime
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medusa -u 1001

# Set working directory and ownership
WORKDIR /app
RUN chown medusa:nodejs /app

# Configure Yarn under $HOME to avoid /app/.yarn writes
USER medusa
ENV HOME=/home/medusa
ENV YARN_CACHE_FOLDER=$HOME/.yarn/cache
ENV YARN_GLOBAL_FOLDER=$HOME/.yarn/global
ENV YARN_INSTALL_STATE_PATH=$HOME/.yarn/install-state.gz

# Copy package manager files
COPY --chown=medusa:nodejs package.json yarn.lock .yarnrc.yml ./

# Install dependencies via Corepack as medusa user
RUN corepack enable && \
    corepack yarn --version && \
    corepack yarn install

# Copy source code
COPY --chown=medusa:nodejs . .

# Build with medusa CLI per docs
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npx medusa build

# Verify build output and remove any PnP files if present
RUN ls -la .medusa/server/ && \
    find .medusa/server -name "*.pnp.*" -type f -delete && \
    echo "Build completed - using node-modules linker"

# Production stage - thin runtime image
FROM node:20-alpine AS production

# Install runtime OS dependencies including PDF generation support
RUN apk add --no-cache \
    dumb-init \
    curl \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    chromium

# Create same medusa user (uid 1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medusa -u 1001

WORKDIR /app

# Copy built server from builder (.medusa/server)
COPY --from=builder --chown=medusa:nodejs /app/.medusa/server ./

# Copy node_modules from builder (no Yarn in runtime)
COPY --from=builder --chown=medusa:nodejs /app/node_modules ./node_modules

# Copy essential files
COPY --from=builder --chown=medusa:nodejs /app/package.json ./

USER medusa

# Production environment
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

# Use dumb-init and start with medusa CLI (not Yarn)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "./node_modules/.bin/medusa", "start"]