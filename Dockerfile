FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npx next build
RUN npx prisma db push --skip-generate

EXPOSE 3000

# Use node directly to run a wrapper script that handles PORT
COPY start.js ./
CMD ["node", "start.js"]
