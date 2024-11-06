FROM node:20-slim as base

WORKDIR /app

COPY package.json .
COPY develop.sh .

RUN apt-get update

RUN npm install -g npm@8.1.2

RUN npm i -g yarn -f

RUN yarn

COPY . .

CMD ["sh", "develop.sh"]
