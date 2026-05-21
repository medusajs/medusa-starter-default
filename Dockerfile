FROM node:20-alpine

WORKDIR /server

COPY package.json yarn.lock ./
COPY patches ./patches

RUN yarn install

COPY . .

EXPOSE 9000

RUN chmod +x start.sh && sed -i 's/\r$//' start.sh

# Start with migrations and then the development server
CMD ["/bin/sh", "./start.sh"]
