FROM node:alpinealpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "apps/credit-faucet/index.js"] 