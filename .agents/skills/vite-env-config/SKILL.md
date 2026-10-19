---
name: vite-env-config
description: Configurar variáveis de ambiente Vite (VITE_*), proxy para o PocketBase (/api e /_) e a peculiaridade do monorepo — cada app tem seus próprios .env.* dentro de apps/<app>/, o root é ignorado. Cobre também VITE_ALLOWED_HOSTS, dev remoto (Codespaces/túnel/Easypanel) e env de build vs runtime. Use quando o usuário quiser apontar para outro servidor PocketBase, rodar em Codespaces/GitPod, adicionar variável de ambiente ou destravar "Blocked request. This host is not allowed".
---

# Vite — envs, proxy e dev remoto

São **dois Vites independentes** (`apps/landing` e `apps/web`). Cada um carrega seus próprios `.env*` — o **root `package.json` é ignorado** pelo Vite.

## Arquivos de env por app

```
apps/
├── landing/
│   ├── .env.example       # commitado — modelo (dev local)
│   ├── .env.production    # commitado — produção (mesma origem)
│   └── .env.local         # gitignored — override pessoal (sobrescreve tudo)
└── web/
    ├── .env.example
    ├── .env.production
    └── .env.local
```

> O Vite **só enxerga** arquivos dentro do `cwd` do app (`apps/web/` ao rodar `npm run dev:web`). `.env.local` tem precedência sobre `.env.production`/`.env.example`.

## Variáveis do template

| App | Variável | Dev | Prod |
|---|---|---|---|
| `web` | `VITE_POCKETBASE_URL` | `http://localhost:8090` | `/` |
| `landing` | `VITE_POCKETBASE_URL` | `http://localhost:8090` | `/` |
| `landing` | `VITE_WEBAPP_URL` | `http://localhost:5174` | `/app` |

`/` = mesma origem (em produção o PB serve o frontend).

## Consumindo no código

```ts
const url = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'
```

> Não use `process.env.*` (é Next/Nuxt). Vite usa `import.meta.env.*`.

## `VITE_ALLOWED_HOSTS` (env custom do projeto)

**Não é env do Vite** — é lida por `vite.local.config.ts` (nos dois apps) e vira `server.allowedHosts`:

```ts
// apps/web/vite.local.config.ts (resumo)
const allowedHosts: true | string[] = (() => {
  const raw = process.env.VITE_ALLOWED_HOSTS
  if (!raw) return true              // default: aceita qualquer host
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : true
})()
```

- Default `true` (aceita qualquer Host) — necessário atrás de proxy/túnel/porta forwarding, cujo hostname muda.
- Pra travar por domínio em produção:
  ```bash
  export VITE_ALLOWED_HOSTS="meudominio.com,www.meudominio.com"
  ```

> Erro típico no dev remoto: `Blocked request. This host ("xxx") is not allowed.` → o Vite 5+ bloqueia por padrão. Solução: usar `vite.local.config.ts` (já é o default do template) ou setar `VITE_ALLOWED_HOSTS`.

## Proxy do Vite

`apps/web/vite.config.ts` já faz proxy do `/api` e `/_` para o PocketBase:

```ts
const env = loadEnv(mode, __dirname, 'VITE_')
const pbUrl = env.VITE_POCKETBASE_URL || 'http://localhost:8090'

server: {
  proxy: {
    '/api': { target: pbUrl, changeOrigin: true },
    '/_':   { target: pbUrl, changeOrigin: true },
  },
}
```

`apps/landing/vite.config.ts` (porta 5173) faz proxy de `/api` e `/_` para o PB, e de `/app` para o web app:

```ts
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:8090', changeOrigin: true },
    '/_':   { target: 'http://localhost:8090', changeOrigin: true },
    '/app': { target: 'http://localhost:5174', changeOrigin: true },
  },
}
```

> `changeOrigin: true` é obrigatório quando o destino tem host/porta diferentes do Vite (caso padrão com o PB em `:8090`).

### Adicionar uma rota de proxy

```ts
server: {
  proxy: {
    '/api':       { target: pbUrl, changeOrigin: true },
    '/_':         { target: pbUrl, changeOrigin: true },
    '/api/files': { target: pbUrl, changeOrigin: true },
  },
}
```

## Adicionar uma env nova

```bash
# 1) documentar no modelo
echo "VITE_SENTRY_DSN=" >> apps/web/.env.example

# 2) usar no código
console.log(import.meta.env.VITE_SENTRY_DSN)
```

> Só variáveis com prefixo `VITE_` são expostas ao código do browser.

## Dev remoto (Codespaces / GitPod / túnel / reverse proxy)

O `scripts/pocketbase.js` e o `vite.local.config.ts` já fazem bind em **`0.0.0.0`** (não `127.0.0.1`) justamente pra isso. Configure o `.env.local` apontando pra URL externa:

```bash
cat > apps/web/.env.local << EOF
VITE_POCKETBASE_URL=https://obscure-engine-xxxxxx-8090.app.github.dev/
EOF

cat > apps/landing/.env.local << EOF
VITE_POCKETBASE_URL=https://obscure-engine-xxxxxx-8090.app.github.dev/
VITE_WEBAPP_URL=https://obscure-engine-xxxxxx-5174.app.github.dev/
EOF
```

Diagnóstico rápido quando a URL externa não funciona:

```bash
ss -tln | grep 8090     # deve mostrar 0.0.0.0, não 127.0.0.1
```

## Build vs runtime

- `npm run build` (`vite build`) **congela** o valor de `VITE_*` no bundle. Ele é **build-time**, não runtime.
- Se a URL do PocketBase mudar depois do build, precisa **rebuildar** — reiniciar o processo não muda o bundle.
- **Nunca** coloque segredo em `VITE_*` (vai pro JS do navegador). Pra dado sensível, use hook do PocketBase com `$os.getenv`.

## Type-safety das envs

```ts
// apps/web/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string
  readonly VITE_WEBAPP_URL?: string
  readonly VITE_ALLOWED_HOSTS?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
```

## Boas práticas

| ✅ Fazer | ❌ Não fazer |
|---|---|
| Commitar `.env.example` e `.env.production` com placeholders | Commitar `.env.local` ou segredo real |
| Usar só `VITE_*` no front | Usar variável sem prefixo (vira `undefined`) |
| Tipar `ImportMetaEnv` pra autocomplete | Acessar via `process.env` |
| `.env.local` pra override pessoal / Codespaces | Editar `.env.production` pra testar mudança local |
| Log de env só em dev (`if (import.meta.env.DEV)`) | Espalhar `console.log` de env em prod |

## Diagnóstico

```bash
# ver o que o Vite enxergou
cd apps/web && npx vite --debug
# ou temporariamente no main.ts:
console.table(import.meta.env)
```
