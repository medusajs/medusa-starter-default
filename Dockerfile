# ---- Base Stage ----
# Use an official Node.js LTS version on Alpine Linux for a small base
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory
WORKDIR /app

# Install OS-level dependencies needed for native Node.js modules (e.g., node-gyp)
# AND essential runtime dependencies like ca-certificates
RUN apk add --no-cache --virtual .gyp python3 make g++ git \
    && apk add --no-cache ca-certificates tzdata


# ---- Builder Stage ----
# This stage installs all dependencies (including dev) and builds the application
FROM base AS builder

# Copy package manager files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copy the rest of the application source code
COPY . .

# Build the Medusa application (creates .medusa/server/medusa-config.js)
RUN yarn build


# ---- Production Stage ----
# This stage creates the final, lean production image
FROM base AS production

# Set Node environment to production
ENV NODE_ENV=production

# Set working directory for the final stage
WORKDIR /app

# Copy necessary package manager files from builder stage
COPY --from=builder /app/package.json /app/yarn.lock* /app/package-lock.json* /app/pnpm-lock.yaml* ./

# Copy tsconfig.json - may be needed by Medusa for path resolution at runtime
COPY --from=builder /app/tsconfig.json /app/tsconfig.json

# Copy the entire compiled backend code directory first
COPY --from=builder /app/.medusa/server ./.medusa/server

# Explicitly copy the COMPILED medusa-config.js from the build output to the root directory
COPY --from=builder /app/.medusa/server/medusa-config.js /app/medusa-config.js

# Install ONLY production dependencies
RUN if [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --omit=dev; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Remove the build-time OS dependencies (.gyp group) but keep runtime ones (ca-certificates)
RUN apk del .gyp

# Create and switch to a non-root user for security
USER node

# Expose the port Medusa runs on (default is 9000)
EXPOSE 9000

# Override the default 'node' entrypoint to ensure CMD is executed directly
ENTRYPOINT []

# Command to run the Medusa application using npx to ensure CLI is found
CMD ["npx", "medusa", "start"]
