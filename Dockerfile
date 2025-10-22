# Development Dockerfile for Medusa
FROM node:20-alpine

# Set working directory
WORKDIR /server

# Install build prerequisites for native Node modules
RUN apk add --no-cache python3 make g++

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml ./

# Install dependencies with the Yarn version pinned in package.json
RUN corepack enable \
  && yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the development server
CMD ["./start.sh"]
