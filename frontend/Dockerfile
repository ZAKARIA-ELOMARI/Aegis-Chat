# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run Vite with --host to make it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]