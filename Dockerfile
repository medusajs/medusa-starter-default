# ---- Base Stage ----
# Use an official Node.js LTS version on Alpine Linux for a small base
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory
WORKDIR /app

# Install OS-level dependencies needed for native Node.js modules (e.g., node-gyp)
# python3, make, g++ are required for compiling native addons.
# git might be needed if you have git dependencies in package.json.
# Using --virtual .gyp allows us to easily remove them later.
RUN apk add --no-cache --virtual .gyp python3 make g++ git


# ---- Builder Stage ----
# This stage installs all dependencies (including dev) and builds the application
FROM base AS builder

# Copy package manager files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies based on the lock file found
# Using --frozen-lockfile or ci ensures reproducible installs
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copy the rest of the application source code
COPY . .

# Build the Medusa application
# This command compiles TypeScript, builds the admin panel (if included),
# and places the output in the .medusa directory.
RUN yarn build
# Or: npm run build / pnpm build, depending on your project setup

# ---- Production Stage ----
# This stage creates the final, lean production image
FROM base AS production

# Set Node environment to production
ENV NODE_ENV=production

# Copy necessary package manager files from builder stage
COPY --from=builder /app/package.json /app/yarn.lock* /app/package-lock.json* /app/pnpm-lock.yaml* ./

# Copy essential configuration files
# --- !!! KEY CHANGE HERE !!! ---
# Copy the compiled backend code from the builder stage.
# Medusa v1.18+ outputs the server build to `.medusa/server`.
# We copy it into a 'dist' folder in the final image, which is a common convention.
COPY --from=builder /app/.medusa/server ./dist
# --- End Key Change ---

# OPTIONAL: Copy the compiled admin frontend if you want to serve it from the same container
# COPY --from=builder /app/.medusa/build ./admin-build

# Install ONLY production dependencies
RUN if [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --omit=dev; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Remove the build-time OS dependencies installed in the base stage
RUN apk del .gyp

# Create and switch to a non-root user for security
# The 'node' user is created by the official Node.js image
USER node

# Expose the port Medusa runs on (default is 9000)
EXPOSE 9000

# ---- Add this line ----
# Override the default 'node' entrypoint to ensure CMD is executed directly
ENTRYPOINT []
# ---- End Add ----

# Keep this CMD (or ensure it's using npx)
CMD ["npx", "medusa", "start"]
