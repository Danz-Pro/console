FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npx next build
RUN npx prisma db push --skip-generate

EXPOSE 3000

CMD ["npx", "next", "start", "-H", "0.0.0.0"]
