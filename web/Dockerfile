# Bassh Web API (Next.js)
# Usage: docker-compose up web | or: docker build -t bassh-web . && docker run -p 3000:3000 --env-file .env bassh-web
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Development (default); for production use: npm run build && npm start
CMD ["npm", "run", "dev"]