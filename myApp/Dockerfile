FROM node:20-alpine

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli@latest

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY . .

# Expose Expo dev server port
EXPOSE 8081

# Start Expo dev server
CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
