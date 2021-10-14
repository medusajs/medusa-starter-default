FROM node:16

WORKDIR /usr/src/app

RUN npm install -g @medusajs/medusa-cli
COPY package*.json ./

RUN npm install

EXPOSE 9000

CMD [ "/bin/bash", "./entrypoint.sh" ]