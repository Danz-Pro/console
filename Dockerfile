# =============================================
# Stage 1: Install dependencies
# =============================================
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

# =============================================
# Stage 2: Build application
# =============================================
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create db directory
RUN mkdir -p db

# Build Next.js (standalone mode)
RUN bunx next build

# =============================================
# Stage 3: Production runner
# =============================================
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Railway dynamically sets PORT - let it override
ENV HOSTNAME="0.0.0.0"

# Install required system deps for sharp/prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy custom server entry
COPY --from=builder /app/server.js ./server.js

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create db directory and fix permissions
RUN mkdir -p db && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["bun", "server.js"]
