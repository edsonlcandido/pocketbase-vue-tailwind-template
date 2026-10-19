---
name: pocketbase-gotchas
description: Referência rápida das pegadinhas do PocketBase 0.40.x neste template — routing de SPA com $apis.static e {path...}, flags de CLI, estrutura do Dockerfile multi-stage, URL do PocketBase no frontend em produção e comunicação entre serviços. Use quando o pedido mencionar routerAdd, $apis.static, pb_public, SPA routing 404, wildcard, Dockerfile do PocketBase, proxy reverso ou URL do PB no Vue.
---

# PocketBase 0.40.x — routing, hooks e pegadinhas

> ⚠️ **Não invente sintaxe.** Referência oficial:
> - Routing: https://pocketbase.io/docs/js-routing/
> - JS overview: https://pocketbase.io/docs/js-overview/

## Versão

- PocketBase **0.40.5** (linux_amd64 / darwin / windows)
- Verificar: `./pocketbase --version`
- Versões antigas (0.22.x) têm APIs diferentes — não copiar código de lá.

---

## Rota catch-all pra SPA

A sintaxe correta é **`{path...}`** (três pontos) — é o catch-all do Go. `{path?}` **não existe**.

```js
// ❌ não existe
routerAdd("GET", "/app/{path?}", ...)
// ❌ só captura 1 segmento
routerAdd("GET", "/app/{path}", ...)

// ✅ CERTO
routerAdd("GET", "/app/{path...}", $apis.static("pb_public/app", true))
```

| Sintaxe | Significado |
|---|---|
| `{path}` | parâmetro único |
| `{path...}` | catch-all (múltiplos segmentos) — **3 pontos** |
| `{path?}` | **não existe** |

### Servir arquivos estáticos

```js
// serve o diretório inteiro, com fallback de SPA
routerAdd("GET", "/{path...}", $apis.static("pb_public", true))
routerAdd("GET", "/app/{path...}", $apis.static("pb_public/app", true))
```

**Parâmetros de `$apis.static(dirPath, spaFallback)`:**

- `dirPath` — caminho do diretório, relativo ao working dir do PB (`/app` na imagem Docker)
- `spaFallback` — `false` = 404 se não achar; `true` = devolve o `index.html` (modo SPA)

No template, a **landing** é servida direto pelo PB (sem hook: `pb_public/` é a raiz estática do PB) e o **web app** precisa do hook `main.pb.js` com `spaFallback = true`.

### Ordem de registro

O PB processa os arquivos de `pb_hooks/` em **ordem alfabética**. Se existir uma rota de API e um catch-all, o catch-all ganha se for registrado primeiro. Use prefixo numérico no nome do arquivo:

```
pb_hooks/
├── 00-api.pb.js        # rotas de API (registradas primeiro)
└── main.pb.js          # catch-all /app/{path...}
```

---

## Hook completo do template (Vue SPA)

```js
/// <reference path="../pb_data/types.d.ts" />

// Landing na raiz é servida pelo PB automaticamente (pb_public/index.html)
// Web app em /app/*
routerAdd("GET", "/app/{path...}", $apis.static("pb_public/app", true))
```

---

## Dockerfile — versão via ARG

```dockerfile
ARG POCKETBASE_VERSION=0.40.5

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && rm pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
```

> ⚠️ **Não use imagem do Docker Hub** — `pocketbase/pocketbase` não existe (oficial é `ghcr.io/pocketbase/pocketbase`).

### npm workspaces no Dockerfile

O Dockerfile tem que copiar **todos** os arquivos de config do app, não só o `package.json`:

```dockerfile
# ✅ CERTO
COPY apps/landing/package*.json ./apps/landing/
COPY apps/landing/tsconfig.json ./apps/landing/
COPY apps/landing/vite.config.ts ./apps/landing/
COPY apps/landing/postcss.config.js ./apps/landing/
COPY apps/landing/tailwind.config.js ./apps/landing/
COPY apps/landing/src ./apps/landing/src/
COPY apps/landing/index.html ./apps/landing/
COPY apps/landing/public ./apps/landing/public/
```

```dockerfile
# ❌ ERRADO — só o package.json não basta
COPY package*.json ./
COPY apps/landing/package*.json ./apps/landing/
```

Motivo: o `npm run build` roda `vue-tsc` (precisa do `tsconfig.json`) e o Vite (precisa de `vite.config.ts` + `postcss.config.js`).

---

## URL do PocketBase no frontend

Em produção o Vue é servido pelo **mesmo PocketBase** → mesma origem. Use URL relativa:

```ts
// apps/web/src/services/pocketbase.ts
function getPocketBaseUrl(): string {
  if (import.meta.env.PROD) return window.location.origin
  return 'http://localhost:8090'
}
const pb = new PocketBase(getPocketBaseUrl())
```

No template isso já vem resolvido por env (não precisa hardcodar):

```env
# apps/web/.env.production
VITE_POCKETBASE_URL=/
```

> `VITE_*` é **build-time**: o valor é congelado no bundle. Se a URL do PB mudar, tem que **rebuildar**, não só reiniciar o container.

---

## Comunicação entre serviços

Quando o template ganhar um backend extra (API Python/Node), use o **hostname Docker interno**, nunca a URL pública:

```env
# serviço que fala com o PB
POCKETBASE_URL=http://pocketbase:8090
# serviço que é chamado pelo PB
API_URL=http://api:8000
```

No hook, leia do ambiente com default:

```js
const base = $os.getenv("API_URL") || "http://api:8000";
```

Rede Docker interna: nenhum serviço precisa expor porta pública se só fala com os outros.

---

## Testar localmente

```bash
# 1) Build dos dois apps
npm run build:landing && npm run copy:landing
npm run build:web && npm run copy:app

# 2) Baixar o PB (o script já faz isso)
npm run dev:pb

# 3) Ou manualmente
# wget https://github.com/pocketbase/pocketbase/releases/download/v0.40.5/pocketbase_0.40.5_linux_amd64.zip
# unzip pocketbase_0.40.5_linux_amd64.zip
# mkdir -p pb_hooks pb_migrations pb_data pb_public/app
# cp -r apps/landing/dist/* pb_public/
# cp -r apps/web/dist/* pb_public/app/
# ./pocketbase serve
```

Acesso: landing em `/`, web app em `/app/`, admin em `/_/`.

---

## Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| `bad wildcard name "path?"` | `{path?}` não existe | `{path}` (1 segmento) ou `{path...}` (catch-all) |
| `Object has no member 'static'` | versão muito antiga do PB | subir pra 0.40.x |
| `tsc` não encontrado no build Docker | faltou copiar arquivos de config | copiar tsconfig/vite/postcss |
| SPA dá 404 em `/app/rota` | falta o `spaFallback = true` | `$apis.static("pb_public/app", true)` |
| Rota de API devolve o HTML da SPA | catch-all registrado antes | prefixo numérico no arquivo do hook |
| 404 em `/api/...` no browser mas funciona no curl | URL do PB errada no front | `VITE_POCKETBASE_URL=/` (mesma origem) |

---

## Migrations JS (PB 0.40+)

> **Skill dedicada:** `.agents/skills/pocketbase-migrations/SKILL.md` — cobre em profundidade as 3 regras, sintaxe de field, timestamps, idempotência, teste local com `pb_data` + `sqlite3` e tabela de erros.

Resumo:

- **NUNCA editar uma migration já commitada** → o PB não reaplica. Correção = migration nova, idempotente, com timestamp maior.
- **Opções de field diretas no field** (PB 0.40+): `values`, `collectionId`, `maxSelect`, `cascadeDelete` — **não** dentro de `options: {}`.
- **Field novo em collection existente**: `collection.fields.add(new Field({...}))` (objeto literal falha).
- **Testar antes de commitar**: subir o PB com `pb_data` limpo e conferir o startup + `sqlite3`.
