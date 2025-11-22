FROM node:20-alpine

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

# Build the admin panel for production
RUN npm run build

EXPOSE 9000

# Use production start, not dev
CMD ["npm", "run", "start"]
