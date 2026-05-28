# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY .env.production .env.production
COPY .env.staging .env.staging
COPY .env.development .env.development

EXPOSE 3000

CMD ["node", "dist/main.js"]
