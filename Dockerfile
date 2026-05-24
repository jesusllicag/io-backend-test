ARG APP

# ── deps: solo dependencias de producción ────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── build: compilar con webpack (NestJS monorepo) ────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
ARG APP
COPY package*.json ./
RUN npm ci
COPY nest-cli.json tsconfig.json ./
COPY apps ./apps
COPY libs ./libs
RUN ./node_modules/.bin/nest build ${APP}

# ── production: imagen final mínima ──────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ARG APP
ENV NODE_ENV=production
ENV APP=${APP}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD node dist/apps/${APP}/main.js
