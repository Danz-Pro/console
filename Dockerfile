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

# DO NOT set PORT - Railway injects it dynamically

CMD ["npx", "next", "start", "-H", "0.0.0.0"]
