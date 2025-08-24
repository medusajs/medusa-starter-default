FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S medusa -u 1001

WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./

# Enable Corepack for Yarn 4
RUN corepack enable

# Install dependencies
RUN yarn install

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs && chown -R medusa:nodejs uploads logs

# Switch to non-root user
USER medusa

# Expose port
EXPOSE 9000

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["yarn", "start"]
