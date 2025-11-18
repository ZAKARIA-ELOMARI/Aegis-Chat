# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the port your backend runs on (8000 based on your code)
EXPOSE 8000

# Start the server
CMD ["npm", "start"]