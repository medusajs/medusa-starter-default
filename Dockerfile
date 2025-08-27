# Multi-stage Dockerfile optimized for MedusaJS deployment
# Build stage - compiles the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Enable Corepack for modern Yarn
RUN corepack enable

# Copy package files first for better Docker layer caching
COPY package.json yarn.lock .yarnrc.yml ./

# Install all dependencies (including dev dependencies for building)
RUN yarn install --immutable

# Copy source code
COPY . .

# Fix zod package.json exports issue - add missing v3 export
RUN node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('./node_modules/zod/package.json', 'utf8')); if (pkg.exports && !pkg.exports['./v3']) { pkg.exports['./v3'] = { types: './index.d.ts', require: './lib/index.js', import: './lib/index.mjs' }; fs.writeFileSync('./node_modules/zod/package.json', JSON.stringify(pkg, null, 2)); console.log('Added ./v3 export to zod package.json'); }"

# Build the application using MedusaJS CLI
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run build with verbose logging
RUN npx medusa build --verbose 2>&1 | tee build.log || (cat build.log && exit 1)

# Verify build output structure
RUN ls -la .medusa/server/ && echo "Build completed successfully"

# Production stage - runs the built application
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medusa -u 1001

# Set working directory
WORKDIR /app

# Enable Corepack for Yarn before switching users
RUN corepack enable

# Copy the built application from builder stage
COPY --from=builder --chown=medusa:nodejs /app/.medusa/server ./

# Copy yarn configuration to ensure consistent behavior
COPY --from=builder --chown=medusa:nodejs /app/.yarnrc.yml ./

# Switch to non-root user before yarn operations
USER medusa

# Set Yarn cache and install directories to be owned by medusa user
ENV YARN_CACHE_FOLDER=/app/.yarn/cache
ENV YARN_INSTALL_STATE_PATH=/app/.yarn/install-state.gz

# Install production dependencies in the built server directory
RUN yarn install --immutable

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application using the official start script
CMD ["yarn", "run", "start"]