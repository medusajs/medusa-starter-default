FROM node:17.1.0

WORKDIR /app

COPY package.json .
COPY develop.sh .

RUN apt-get update

RUN apt-get install -y python

RUN npm install -g npm@8.1.2

RUN npm install -g @medusajs/medusa-cli@latest

RUN npm install -f

COPY . .

CMD ["sh", "develop.sh"]
