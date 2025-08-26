# Multi-stage Dockerfile optimized for Medusa build
# Build stage - runs on powerful machine (local/CI)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Enable Corepack for modern Yarn
RUN corepack enable

# Copy source code (includes all Yarn 4 files)
COPY . .

# Install all dependencies (including dev dependencies for building)
RUN yarn install --immutable

# Fix zod package.json exports issue - add missing v3 export
RUN node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('./node_modules/zod/package.json', 'utf8')); if (pkg.exports && !pkg.exports['./v3']) { pkg.exports['./v3'] = { types: './index.d.ts', require: './lib/index.js', import: './lib/index.mjs' }; fs.writeFileSync('./node_modules/zod/package.json', JSON.stringify(pkg, null, 2)); console.log('Added ./v3 export to zod package.json'); }"

# Build the application using Medusa CLI
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npx medusa build --verbose 2>&1 | tee build.log || (cat build.log && exit 1)

# Create public directory and copy admin files to expected location
#RUN mkdir -p public/admin && cp -r .medusa/server/public/admin/. public/admin/

# Production stage - runs on VPS
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medusa -u 1001

# Set working directory and copy built application
WORKDIR /app
COPY --from=builder --chown=medusa:nodejs /app/.medusa ./.medusa

# Switch to built server directory
WORKDIR /app/.medusa/server

# Install production dependencies
RUN corepack enable

RUN yarn install

# Switch to non-root user
USER medusa

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the built application
CMD ["yarn", "run", "start"]