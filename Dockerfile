# syntax=docker/dockerfile:1

# ---------- 1. deps: install every dependency (TypeScript is needed to build) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. builder: compile TypeScript to dist/ ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# tsconfig.build.json leaves the tests out
RUN npm run build

# ---------- 3. prod-deps: runtime dependencies only (no TypeScript, ESLint, Vitest, ...) ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 4. runner: the small image that actually runs ----------
FROM node:22-alpine AS runner
WORKDIR /app

# Everything else (JWT_SECRET, MONGO_URI, CORS_ORIGINS, ...) comes from the environment at
# runtime (docker-compose.yaml), never from the image
ENV NODE_ENV=production \
    PORT=2200

# Run as a non-root user
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs api

COPY --from=prod-deps --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/dist ./dist
COPY --chown=api:nodejs package.json ./

USER api
EXPOSE 2200

# GET /health is the plain liveness probe in src/core/loaders/app.ts
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:2200/health >/dev/null || exit 1

# node directly (not npm) so SIGTERM reaches the graceful shutdown handler
CMD ["node", "dist/server.js"]
