FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY . .

RUN npx prisma generate
RUN npx next build

# Create db dir and init schema
RUN mkdir -p db

# Write a robust start script
RUN echo '#!/bin/sh\n\
set -e\n\
echo "=== Initializing database ==="\n\
npx prisma db push --skip-generate 2>&1 || echo "DB init warning (non-fatal)"\n\
echo "=== Starting server on port ${PORT:-3000} ==="\n\
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"\n' > /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
