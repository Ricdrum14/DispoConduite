# ---- Build : Vite bake les variables VITE_* dans le bundle au build, pas
# au runtime — d'où le besoin d'un ARG plutôt qu'une simple env du conteneur.
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime : fichiers statiques servis par nginx ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
