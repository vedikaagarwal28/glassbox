FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY workers/package*.json ./
RUN npm install --omit=dev
COPY workers/src ./src
CMD ["npm","start"]
