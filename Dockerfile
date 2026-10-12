# =============================================================================
# VoiceInterview AI — Multi-stage Docker Build
# Builds frontend (Vite) + backend (Node.js) into a single container
# =============================================================================

# ── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies first (better cache)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Build Backend ───────────────────────────────────────────────────
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Install dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy source
COPY backend/src/ ./src/
COPY backend/tsconfig.json ./
COPY backend/prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npx tsc


# ── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY backend/prisma/ ./prisma/
RUN npx prisma generate

# Copy compiled backend
COPY --from=backend-build /app/backend/dist/ ./dist/

# Copy frontend build output
COPY --from=frontend-build /app/frontend/dist/ ./frontend/dist/

# Copy seed data
COPY backend/data/ ./data/

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
