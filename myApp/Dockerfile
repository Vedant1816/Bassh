# Bassh Mobile App (Expo / React Native)
# Usage: docker-compose up expo | or: docker build -t bassh-expo . && docker run -p 8081:8081 --env-file .env bassh-expo
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci || npm install

# Copy app files
COPY . .

EXPOSE 8081

# Start Expo dev server (LAN mode for Docker host access)
CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
