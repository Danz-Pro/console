FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npx next build
RUN npx prisma db push --skip-generate

EXPOSE 3000

# CRITICAL: next start does NOT read PORT env var, must pass -p explicitly
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
