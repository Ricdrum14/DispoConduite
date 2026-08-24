# ---- Build : compile TypeScript + génère le client Prisma ----
FROM node:20-alpine AS build
WORKDIR /app

# bcrypt compile un module natif (node-gyp) — nécessite ces outils sur alpine.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime : image finale, allégée du code source TS ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# Applique les migrations en attente puis démarre — adapté à un déploiement
# mono-instance ; pour plusieurs instances, sortir "prisma migrate deploy"
# dans une étape séparée avant le déploiement.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
