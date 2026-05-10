# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npx next build

# Stage 3: Run
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# System deps for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create writable db directory and init DB
RUN mkdir -p db
RUN npx prisma db push --skip-generate

EXPOSE 3000
ENV HOSTNAME=0.0.0.0

# Start script that initializes DB and runs the server
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
