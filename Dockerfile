# syntax=docker/dockerfile:1.7

# Imagem base do PocketBase com driver libSQL/Turso.
# Buildada no repo edsonlcandido/pocketbase-turso e publicada no ghcr.
# IMPORTANTE: essa imagem já vem com o plugin JSVM registrado — sem ele,
# pb_hooks/*.js e pb_migrations/*.js são ignorados silenciosamente.
ARG POCKETBASE_IMAGE=ghcr.io/edsonlcandido/pocketbase-turso:0.40.6

# ----------------------------------------------------------------------------
# Estágio 1: Build da Landing Page
# ----------------------------------------------------------------------------
FROM node:20-alpine AS landing-builder

WORKDIR /app

# Copiar apenas arquivos de dependências primeiro (cache layer)
COPY package*.json ./
COPY apps/landing/package*.json ./apps/landing/

# Instalar dependências (usando npm install pois package-lock.json pode não existir)
RUN npm install --workspaces=false || npm install

# Copiar código fonte da landing
COPY apps/landing ./apps/landing

# Build da landing page
RUN cd apps/landing && npm install && npm run build

# ----------------------------------------------------------------------------
# Estágio 2: Build do Web App
# ----------------------------------------------------------------------------
FROM node:20-alpine AS web-builder

WORKDIR /app

# Copiar apenas arquivos de dependências primeiro (cache layer)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Instalar dependências
RUN npm install --workspaces=false || npm install

# Copiar código fonte do web app
COPY apps/web ./apps/web

# Build do web app
RUN cd apps/web && npm install && npm run build

# ----------------------------------------------------------------------------
# Estágio 3: Imagem final — PocketBase (libSQL) + landing + web app
# ----------------------------------------------------------------------------
FROM ${POCKETBASE_IMAGE}

# A imagem base já define: WORKDIR /app, USER 1001:1001, EXPOSE 8090 e o CMD
# (pocketbase serve --http=0.0.0.0:8090 --dir=/app/pb_data).
# Os diretórios pb_public, pb_hooks, pb_migrations e pb_data já existem nela,
# com o dono 1001:1001.

# Copiar hooks e migrations (o processo roda como 1001:1001)
COPY --chown=1001:1001 pocketbase/pb_hooks ./pb_hooks
COPY --chown=1001:1001 pocketbase/pb_migrations ./pb_migrations

# Copiar builds das aplicações
COPY --from=landing-builder --chown=1001:1001 /app/apps/landing/dist ./pb_public
COPY --from=web-builder --chown=1001:1001 /app/apps/web/dist ./pb_public/app

# Volume para dados persistentes (uploads + logs.db local)
VOLUME /app/pb_data
