FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm install
RUN npm install -g vinext@latest vite@latest wrangler@latest
COPY . .
