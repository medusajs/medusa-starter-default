FROM node:17.1.0

WORKDIR /app/medusa

COPY package.json .
COPY develop.sh .
COPY yarn.lock .

RUN apt-get update

RUN apt-get install -y python

RUN yarn global add @medusajs/medusa-cli

RUN yarn install

ENTRYPOINT ["./develop.sh"]