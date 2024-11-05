FROM node:22.11.0

WORKDIR /app

COPY package.json .
COPY develop.sh .

RUN apt-get update

RUN npm install -g npm@8.1.2

RUN npm install -f

COPY . .

CMD ["sh", "develop.sh"]
