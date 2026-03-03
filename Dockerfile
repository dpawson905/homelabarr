# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
# Pre-create a minimal DB so Next.js build workers don't race on SQLite init
RUN mkdir -p data && node -e "const D=require('better-sqlite3');const d=new D('./data/homelabarr.db');d.pragma('journal_mode=WAL');d.close();"
RUN npm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone server
COPY --from=builder /app/.next/standalone ./
# Copy static assets into the right place for the standalone server
COPY --from=builder /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder /app/public ./public
# Copy drizzle migrations (needed by migrate.js at runtime)
COPY --from=builder /app/drizzle ./drizzle
# Copy migration + entrypoint scripts
COPY --from=builder /app/migrate.js ./migrate.js
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# better-sqlite3 native binding: the standalone bundler doesn't copy .node files,
# so we copy the whole better-sqlite3 package from the builder's node_modules.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
