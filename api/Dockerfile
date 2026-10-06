FROM node:20-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm install --omit=dev
COPY api/src ./src
CMD ["npm","start"]
