# Development Dockerfile for Medusa
FROM node:20-alpine

# Set working directory
WORKDIR /server

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml ./

# Install all dependencies using yarn (respect packageManager field)
RUN corepack enable \
  && corepack prepare $(node -p "require('./package.json').packageManager") --activate \
  && yarn install

# Copy source code
COPY . .

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the development server
CMD ["./start.sh"]
