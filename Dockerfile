# syntax=docker/dockerfile:1

# 1) Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy lockfiles to leverage Docker layer caching
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Prefer npm ci if a package-lock.json exists, otherwise fallback to npm install
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# 2) Build the app
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js production build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Runtime image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Use a non-root user for security
RUN adduser -D -H nextjs
USER nextjs

# Copy compiled app and necessary files
COPY --from=builder /app .

# Expose the port Next.js listens on
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start"]
