FROM node:18

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules

RUN npm install --legacy-peer-deps

COPY . .

COPY .env /app/.env

RUN npm run build

EXPOSE 8080

CMD ["node", "build/src/main.js"]