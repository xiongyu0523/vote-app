FROM node:18.12.1-alpine3.15

ENV REDIS_HOST=changeme
ENV REDIS_PORT=6379

WORKDIR /app

COPY [ "./", "/app"]

RUN npm install

EXPOSE 50001/TCP

CMD [ "node", "app.js" ]