FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm install
RUN npm install -g vinext@latest vite@latest wrangler@latest
COPY . .
