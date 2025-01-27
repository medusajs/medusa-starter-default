FROM node:22-alpine

WORKDIR /application

COPY . .

RUN yarn install --frozen-lockfile

EXPOSE 9000

CMD ["sh", "docker-bootstrap.sh"]
