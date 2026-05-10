FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy source code
COPY . .

# Build the application
RUN bun run build

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/custom.db"

# Create db directory
RUN mkdir -p /app/db

CMD ["bun", "run", "start"]
