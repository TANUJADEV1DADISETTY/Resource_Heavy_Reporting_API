# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including dev for tsc)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY src ./src
RUN npx tsc --project tsconfig.json

# ─── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy env example (no secrets)
COPY .env.example .env.example

# Application listens on PORT (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Health-check — maps directly to GET /health
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/api/server.js"]
