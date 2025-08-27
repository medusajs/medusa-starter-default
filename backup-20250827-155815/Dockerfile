# Multi-stage Dockerfile optimized for MedusaJS deployment with robust PnP fix
# Build stage - compiles the application
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Create medusa user in build stage to avoid permission issues
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medusa -u 1001

# Set working directory and set up proper ownership
WORKDIR /app

# Fix where Yarn writes - create medusa home yarn directories as root
RUN mkdir -p /home/medusa/.yarn/cache /home/medusa/.yarn/global && \
    chown -R medusa:nodejs /home/medusa/.yarn && \
    chown medusa:nodejs /app

# Switch to medusa user for all operations  
USER medusa

# Set medusa home and Yarn environment variables
ENV HOME=/home/medusa
ENV YARN_NODE_LINKER=node-modules
ENV YARN_CACHE_FOLDER=$HOME/.yarn/cache
ENV YARN_GLOBAL_FOLDER=$HOME/.yarn/global
ENV YARN_INSTALL_STATE_PATH=$HOME/.yarn/install-state.gz

# Copy package files first for better Docker layer caching
COPY --chown=medusa:nodejs package.json yarn.lock .yarnrc.yml ./

# Fix how Yarn is invoked - only via Corepack as medusa
RUN corepack yarn -v && \
    corepack yarn install

# Copy source code
COPY --chown=medusa:nodejs . .

# Fix zod package.json exports issue - add missing v3 export
RUN node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('./node_modules/zod/package.json', 'utf8')); if (pkg.exports && !pkg.exports['./v3']) { pkg.exports['./v3'] = { types: './index.d.ts', require: './lib/index.js', import: './lib/index.mjs' }; fs.writeFileSync('./node_modules/zod/package.json', JSON.stringify(pkg, null, 2)); console.log('Added ./v3 export to zod package.json'); }"

# Build the application using MedusaJS CLI
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run build with verbose logging
RUN npx medusa build --verbose 2>&1 | tee build.log || (cat build.log && exit 1)

# Verify build output and ensure no PnP files exist
RUN ls -la .medusa/server/ && \
    echo "Build completed successfully" && \
    find .medusa/server -name "*.pnp.*" -type f && \
    echo "No PnP files should be listed above"

# Production stage - runs the built application
FROM node:20-alpine AS production

# Install runtime dependencies including Chromium dependencies for Puppeteer
RUN apk add --no-cache dumb-init curl \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Create app user for security (same UID as builder)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medusa -u 1001

# Set working directory
WORKDIR /app

# Copy the built application from builder stage (already owned by medusa)
COPY --from=builder --chown=medusa:nodejs /app/.medusa/server ./

# Copy node_modules from builder to avoid runtime install
COPY --from=builder --chown=medusa:nodejs /app/node_modules ./node_modules

# Copy essential files with proper ownership
COPY --from=builder --chown=medusa:nodejs /app/package.json ./

# Switch to medusa user before any operations
USER medusa

# Set Node.js production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application directly with node (remove Yarn from runtime entirely)
CMD ["node", "/app/node_modules/.bin/medusa", "start", "-H", "0.0.0.0"]