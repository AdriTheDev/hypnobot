FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma.config.ts ./
COPY prisma ./prisma
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate

FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/src/generated ./src/generated
COPY tsconfig.json ./
COPY src ./src
USER node
CMD ["tsx", "src/index.ts"]
