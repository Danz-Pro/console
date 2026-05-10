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

# Build Next.js standalone + copy static assets
RUN bunx next build
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

# =============================================
# Stage 3: Production runner
# =============================================
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# Railway injects PORT dynamically; fallback to 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# System deps for Prisma runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output as-is
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy Prisma for runtime schema access
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Ensure db dir exists with write permissions
RUN mkdir -p db && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
