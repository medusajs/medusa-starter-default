# Dockerfile for Medusa Backend (Based on Node 18/20)

# --- Base Stage ---
# Use an official Node runtime. Medusa v1.20+ recommends Node 20.
# Use Node 18 if you encounter issues with native dependencies on Node 20/Alpine.
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies needed for potential native modules (like sharp for images)
# and git (sometimes needed for dependency fetching)
RUN apk add --no-cache --virtual .gyp python3 make g++ git

# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

# Copy package.json and lock file
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
# Use yarn if yarn.lock exists, otherwise try pnpm or npm
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copy the rest of the application code
COPY . .

# Build the Medusa application (compile Typescript, etc.)
# Check your package.json for the correct build script name
RUN yarn build
# Or: RUN npm run build

# --- Production Stage ---
# Use a clean base image for smaller size
FROM base as production
WORKDIR /app

# Copy necessary configuration files
COPY --from=builder /app/package.json /app/yarn.lock* /app/package-lock.json* /app/pnpm-lock.yaml* ./
COPY --from=builder /app/medusa-config.js /app/medusa-config.js
# Copy compiled code
COPY --from=builder /app/dist ./dist

# Install production dependencies only
# Use yarn if yarn.lock exists, otherwise try pnpm or npm
RUN if [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --prod --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --omit=dev; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Expose port 9000 (or the port your Medusa app listens on)
EXPOSE 9000

# Set environment variable for Node
ENV NODE_ENV=production

# Command to run the application
# Check your package.json "start" script. Often it's 'medusa start' which runs dist/main.js
# Or it might directly run the compiled file.
CMD ["node", "dist/main.js"]
# Alternative if your start script is different: CMD ["yarn", "start"] or ["npm", "run", "start"]

