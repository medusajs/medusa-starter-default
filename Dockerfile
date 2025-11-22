FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build
# Verify admin build exists
RUN ls -la /app/.medusa/admin || echo "Admin build not found"
EXPOSE 9000 7001

CMD ["npm", "run", "start"]
