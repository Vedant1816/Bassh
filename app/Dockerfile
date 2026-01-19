FROM node:20-alpine

WORKDIR /app

# Install Expo tunnel dependency explicitly
RUN npm install -g @expo/ngrok

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start", "--tunnel"]