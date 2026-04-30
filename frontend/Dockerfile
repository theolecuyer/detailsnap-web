FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_AUTH_URL=http://localhost:8081
ARG VITE_CORE_URL=http://localhost:8082
ARG VITE_MEDIA_URL=http://localhost:8083
RUN npm run build

FROM alpine:3.20
WORKDIR /dist
COPY --from=builder /app/dist .
