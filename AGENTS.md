# PocketBase + Vue 3 + Tailwind — Template

Template de backend + frontend: **PocketBase** como API/auth/DB e **monorepo Vue 3 + TypeScript + Tailwind v4** como interface. Usado como base para projetos novos.

> Este arquivo é o contexto operacional para agentes de IA (OpenCode, Copilot, Claude Code, Codex…).
> Ele descreve **o que fazer neste repositório**, não o produto de cada projeto que consome o template.
> Skills com comandos prontos ficam em `.agents/skills/` — índice em `.agents/skills/README.md`.

---

## 1. Sobre o projeto

| Camada | Stack |
|---|---|
| Backend / DB / Auth | PocketBase **0.40.6** (Go), JSVM (hooks + migrations) |
| Banco de dados | **libSQL/Turso remoto** — URL em `URL_LIBSQL_TURSO`. O `pb_data` local só guarda uploads e o `logs.db` |
| Frontend | Vue 3 (Composition API) + TypeScript + Vite 6 + Tailwind CSS **v4** |
| Estado / rotas | Pinia + Vue Router 4 |
| Monorepo | npm workspaces (`apps/*`) |
| Produção | Dockerfile multi-stage → 1 imagem com PB + landing + web app (base: `ghcr.io/edsonlcandido/pocketbase-turso`) |

Requisitos: **Node >= 20.19.0**, npm >= 10.

### O que é cada app

| App | Path | Rota em prod | Papel |
|---|---|---|---|
| `landing` | `apps/landing` | `/` | Página pública de apresentação/marketing |
| `web` | `apps/web` | `/app/` | SPA logado (dashboard, CRUD, etc.) |

Em desenvolvimento as duas rodam em servidores Vite separados (5173 / 5174); em produção **as duas são servidas pelo PocketBase na mesma origem** (por isso `VITE_POCKETBASE_URL=/`).

---

## 2. Estrutura

```
pocketbase-vue-tailwind-template/
├── apps/
│   ├── landing/              # landing page (Vite + Tailwind v4)
│   │   ├── src/{main.ts,style.css}
│   │   ├── .env.example      # modelo commitado (dev)
│   │   ├── .env.production   # commitado (mesma origem: "/" e "/app")
│   │   └── .env.local        # pessoal, gitignored
│   └── web/                  # SPA (Vue 3 + TS + Pinia + Router)
│       ├── src/
│       │   ├── services/     # client PocketBase (fonte única de dados)
│       │   ├── stores/       # Pinia (setup store)
│       │   ├── views/        # páginas roteadas
│       │   ├── router/       # Vue Router + guards
│       │   ├── components/   # componentes reutilizáveis
│       │   ├── App.vue
│       │   └── main.ts
│       ├── vite.config.ts    # base '/app/' + proxy /api e /_
│       └── vite.local.config.ts  # host 0.0.0.0 + allowedHosts (dev remoto)
│
├── pocketbase/
│   ├── pb_hooks/             # hooks JS (routerAdd, onRecordAfter*, ...)
│   │   └── main.pb.js        # SPA routing: /app/{path...}
│   ├── pb_migrations/        # migrations JS (versionadas no git)
│   ├── pb_data/              # estado do PB (gitignored, exceto types.d.ts)
│   └── pb_public/            # estáticos servidos pelo PB
│       ├── (landing build)   # → /
│       └── app/              # (web build) → /app/
│
├── scripts/
│   ├── pocketbase.js         # baixa o binário do PB e sobe em :8090
│   ├── copy-landing.js       # apps/landing/dist → pb_public/
│   └── copy-app.js           # apps/web/dist → pb_public/app/
│
├── Dockerfile                # multi-stage: landing-builder → web-builder → imagem base do ghcr
├── docker-compose.yaml       # PB de produção (build local) com volume pb_data
├── docker-compose.dev.yaml   # PB de dev: imagem do ghcr + hooks/pb_public montados
├── .env.example              # modelo do .env com URL_LIBSQL_TURSO (o .env real é gitignored)
├── AGENTS.md                 # este arquivo
├── .agents/skills/           # skills pra agentes de IA
└── package.json              # root (workspaces: apps/*)
```

---

## 3. Comandos

```bash
npm install                # instala root + workspaces

# desenvolvimento (tudo junto)
npm run dev                # PB :8090 (docker) + landing :5173 + web :5174
npm run dev:pb             # só PocketBase (docker compose -f docker-compose.dev.yaml)
npm run dev:pb:local       # só PocketBase com o binário oficial local (SQLite, sem libSQL)
npm run dev:landing        # só a landing
npm run dev:web            # só o web app

# build (o que o Dockerfile faz)
npm run build              # build:landing → copy:landing → build:web → copy:app
npm run build:landing      # vite build da landing
npm run build:web          # vue-tsc && vite build do web app
npm run copy:landing       # apps/landing/dist → pocketbase/pb_public
npm run copy:app           # apps/web/dist → pocketbase/pb_public/app

# preview do resultado final
npm run preview            # sobe o PB (com os builds já copiados) em :8090
```

Build do web app = **`vue-tsc && vite build`**. O `vue-tsc` é estrito (`strict`, `noUnusedLocals`, `noUnusedParameters`) — erro de tipo **quebra o build**.

### Serviços e URLs (dev)

| Serviço | URL |
|---|---|
| PocketBase (API + admin) | http://localhost:8090 |
| Admin do PocketBase | http://localhost:8090/_/ |
| Landing | http://localhost:5173 |
| Web app | http://localhost:5174 |

### Endereços em produção

| Caminho | Servido por |
|---|---|
| `/` | landing build (`pb_public/`) |
| `/app/**` | web app build (`pb_public/app/`) — via hook `main.pb.js` |
| `/api/**` | REST do PocketBase |
| `/_/**` | Admin do PocketBase |

---

## 4. Variáveis de ambiente

O Vite **só enxerga** arquivos `.env*` dentro do diretório do app (`apps/<app>/`). O root é ignorado.

| Arquivo | Git | Quando |
|---|---|---|
| `apps/<app>/.env.example` | ✅ | modelo documentado (dev local) |
| `apps/<app>/.env.production` | ✅ | usado no `npm run build` (mesma origem) |
| `apps/<app>/.env.local` | ❌ | override pessoal (Codespaces, túnel, etc.) — **sobrescreve tudo** |

| Variável | App | Dev | Prod |
|---|---|---|---|
| `VITE_POCKETBASE_URL` | web + landing | `http://localhost:8090` | `/` |
| `VITE_WEBAPP_URL` | landing | `http://localhost:5174` | `/app` |
| `VITE_ALLOWED_HOSTS` | web + landing | — | — |

- `VITE_ALLOWED_HOSTS` **não é env do Vite**: é uma env custom lida por `vite.local.config.ts` (lista separada por vírgula → `server.allowedHosts`). Default = aceita qualquer host (necessário atrás de proxy/porta túnel).
- `VITE_*` são **build-time**: o valor é congelado no bundle no momento do `vite build`. Não são runtime.
- **Nunca** coloque segredo em `VITE_*` — tudo com esse prefixo vai pro JS do navegador. Use hooks do PocketBase (`$os.getenv`) pra dado sensível.

### Variáveis do backend (raiz do repo)

O PocketBase lê o banco do **ambiente em runtime** — o binário não lê `.env`. O Compose faz a interpolação (`${URL_LIBSQL_TURSO}`) a partir do `.env` da **raiz** (gitignored; modelo no `.env.example`).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `URL_LIBSQL_TURSO` | ✅ Sim | URL do banco principal no libSQL, com o token na query string: `https://host/dev/<namespace>/?authToken=<token>` |
| `URL_LIBSQL_TURSO_AUX` | ⚠️ Opcional | 2º banco para o `auxiliary.db` (tabela `_logs`). Tem que ser um database **separado** — `data.db` e `auxiliary.db` têm as mesmas tabelas de sistema. Vazio = auxiliar no disco local. |

> Dev apontar para o **banco clonado**, prod para o banco de prod. Mesma imagem, `.env` diferente.

---

## 5. Regras do PocketBase (leia antes de mexer em `pocketbase/**`)

O template usa **PB 0.40.5** com JSVM. Detalhes completos e comandos prontos:

| Tema | Skill |
|---|---|
| Migrations (criar collection, campo, migrar dados) | `.agents/skills/pocketbase-migrations/SKILL.md` |
| Hooks JS (`pb_hooks/*.pb.js`), `$http`, `$app`, `routerAdd` | `.agents/skills/pocketbase-jsvm/SKILL.md` |
| Routing, SPA, Dockerfile, pegadinhas gerais | `.agents/skills/pocketbase-gotchas/SKILL.md` |
| Collections, regras de acesso, tipos TS | `.agents/skills/pocketbase-collections/SKILL.md` |

### Resumo — as 8 regras que mais quebram

1. **Nunca editar uma migration depois de commitada.** O PB registra as aplicadas em `pb_data/_migrations` e não reaplica. Correção = **nova** migration com timestamp maior, idempotente.
2. **PB 0.40+: as opções do field vão direto no field** (`values`, `collectionId`, `maxSelect`, `cascadeDelete`…), **não** dentro de `options: {}`. Errado → `(values: cannot be blank.)`.
3. **Pra adicionar field em collection existente**: `collection.fields.add(new Field({...}))`. Objeto literal → `could not convert [object Object] to core.Field`.
4. **`$app.findAllRecords(coll, { filter })` não existe.** Use `$app.findRecordsByFilter(coll, filtro, sort, limit, offset, params)`. `$app.filter()` também não existe.
5. **`$http.send` devolve `Uint8Array`.** Use `resp.json` ou `toString(resp.body)` — nunca `JSON.parse(resp.body)`.
6. **Não chame `e.next()` em `onRecordAfter*Success/Error`.** Só os hooks `*Execute` precisam. Nos After, é no-op silencioso.
7. **`$app.dao().saveRecord()` dentro de `onRecordAfterCreateSuccess` é descartado** pela transação. Pra alterar o record criado, use `onRecordUpdateExecute` ou um save posterior.
8. **Routing de SPA**: `{path...}` (3 pontos) é catch-all; `{path?}` **não existe**. `$apis.static("pb_public/app", true)` — o `true` (SPA fallback) é obrigatório.

### O hook existente (não quebrar)

`pocketbase/pb_hooks/main.pb.js`:

```js
routerAdd("GET", "/app/{path...}", $apis.static("pb_public/app", true))
```

Sem ele, o web app não abre em `/app/...` (a API do PB responde 404 antes do fallback do Vite).

### Migrations deste template

`pocketbase/pb_migrations/` começa **vazio** (só `.gitkeep`). A primeira migration do projeto é criada por quem usa o template — escrevendo à mão (veja a skill) ou exportando do Admin UI (`/_/` → *Save as migration*). **Toda migration vai pro git** — é o que reconstrói o schema em qualquer ambiente.

---

## 6. Workflow obrigatório: validar → commit → push

**REGRA: antes de qualquer `git commit` que toque `apps/web/src/**`, `apps/landing/src/**` ou `pocketbase/**`, rode a validação local. Se quebrar, NÃO commite.**

O roteiro completo (com comandos por plataforma) está em
`.agents/skills/pre-deploy-validation/SKILL.md`. Resumo:

| O que mudou | Validação obrigatória antes do commit |
|---|---|
| `apps/web/src/**` | `npm run build:web` (= `vue-tsc && vite build`) |
| `apps/landing/src/**` | `npm run build:landing` (= `vite build`) |
| `pocketbase/pb_migrations/**` | subir o PB local com `pb_data` limpo e conferir o startup + `sqlite3` |
| `pocketbase/pb_hooks/**` | subir o PB local (hook quebrado = 500 em runtime) e testar a rota |
| `Dockerfile` / `docker-compose.yaml` | `docker build .` |
| `AGENTS.md`, `.agents/**`, `README.md` | nada (docs) |

Ordem de commit sugerida:

```bash
git status --short              # ver o que mudou
# ... rodar as validações acima ...
git add <paths>
git commit -m "tipo(escopo): descrição"
git push
```

Mensagem de commit no formato Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`) — o histórico do repositório segue esse padrão.

**Push não é deploy.** O template não define pipeline de deploy: cada projeto que consome o template decide (CI próprio, painel de hospedagem, etc.). Depois do push, o que vale é: o build local passou, a migration aplica limpa num PB com `pb_data` vazio, e o `Dockerfile` constrói.

### Detectar a área pela mudança

```bash
git status --short
#   M apps/web/src/views/DashboardView.vue   → frontend (build:web)
#   M apps/landing/src/main.ts                → frontend (build:landing)
#   M pocketbase/pb_migrations/1234_x.js      → schema (PB local + sqlite3)
#   M pocketbase/pb_hooks/main.pb.js           → runtime (PB local)
#   M Dockerfile                               → imagem (docker build)
#   M AGENTS.md | .agents/** | README.md       → docs (nada a validar)
```

---

## 7. Pegadinhas conhecidas

### Vue SFC + `vue-tsc`

- **`</script>` literal dentro de template string** quebra o parser do SFC (ele fecha o bloco no primeiro `</script>` que achar). Atinge `</template>` e `</style>` também.
  - `<\u002Fscript>` · `'</' + 'script>'` · `['<', '/script>'].join('')`
- **`{{$json.body.x}}`** dentro de template é interpretado como propriedade da instância. Mova pra constante JS e renderize `{{ MINHA_CONSTANTE }}`, ou use `v-pre`.
- **`TS6133 "declared but never read"`** — `vue-tsc` é estrito: constant declarada e não usada (nem em template, nem em código) **quebra o build**. Apague a declaração.
- **`strict` + `noUnusedLocals` + `noUnusedParameters`** estão ligados no `apps/web/tsconfig.json`. Sem atalho `@/` no path alias — **use import relativo** (`../services/pocketbase`).

### Cache de bundle

O browser do usuário final segura o bundle antigo mesmo com hash novo. Depois de publicar, sempre valide pelo **asset**, não só pelo HTML:

```bash
curl -s https://<dominio>/app/ | grep assets
curl -s https://<dominio>/app/assets/index-XXXX.js | grep "texto-único-da-mudança"
```

A landing usa nomes fixos (`js/main.js`, `css/style.css`) com cache-busting por **query string** (`?v=YYYYMMDD-HHMMSS`) — por isso o "hash" do arquivo não muda entre builds.

### PocketBase

- **A imagem base precisa do JSVM.** `ghcr.io/edsonlcandido/pocketbase-turso` já compila com `jsvm.MustRegister` — sem isso, `pb_hooks/*.js` e `pb_migrations/*.js` são **ignorados silenciosamente** (o app sobe, `/app/*` dá 404 e o schema nunca é criado). Trocar a imagem base pela oficial (`ghcr.io/pocketbase/pocketbase`) **quebra o template**.
- **Catch-all vs hook:** o fork registra `GET /{path...}` (serve `pb_public`). O hook `main.pb.js` registra `GET /app/{path...}`. O roteador do PB resolve o mais específico primeiro — **o hook ganha** e o SPA continua abrindo em `/app/*`. (Verificado em runtime.)
- **O banco é remoto (libSQL):** o `pb_data` local só tem `storage/` (uploads) e `logs.db`. Não versionar `data.db` — ele nem existe local.
- **Latência:** toda query vai por HTTP → o admin do PocketBase fica mais lento que com SQLite local.
- **`foreign_keys`:** o driver libSQL não aplica as pragmas que o SQLite local usa (`?_pragma=foreign_keys(ON)`) — a integridade referencial fica por conta do servidor.
- **PB em container não hot-reloada hook** se o volume montar por cima: reinicie o processo.
- **`pb_data/types.d.ts` é gerado pelo PB em runtime.** Não edite à mão — rode o PB e deixe ele regenerar (o arquivo é versionado no git).
- **`pb_data/data.db` é o estado inteiro.** Versionar `pb_migrations/` reconstrói o schema; os **dados** só voltam via backup.

---

## 8. Nunca commitar

- `.env.local` (já é gitignored) e qualquer arquivo com segredo real
- `pocketbase/pb_data/` (exceto `.gitkeep` e `types.d.ts`) — **dados de usuário**
- Senha/credencial do admin do PocketBase
- Tokens de infra (deploy, registry, API keys). Use placeholder (`<token>`) na documentação e leia do ambiente em runtime.

---

## 9. Skills disponíveis

`.agents/skills/` — carregadas automaticamente por agentes compatíveis (OpenCode lê `.agents/skills/`, `.claude/skills/` e `.opencode/skills/`).

| Skill | Quando usar |
|---|---|
| `pocketbase-migrations` | criar/alterar collection, campo, migration de dados |
| `pocketbase-jsvm` | escrever/depurar hook em `pb_hooks/`, `$http`, `$app`, `routerAdd` |
| `pocketbase-gotchas` | routing, SPA, Docker, env vars do PB, erros conhecidos |
| `pocketbase-collections` | criar collection, regras de acesso, hooks de evento, tipos TS |
| `pre-deploy-validation` | validar antes de commitar/pushar (build, migration, docker) |
| `vue-pinia-store` | criar store Pinia no padrão do projeto |
| `vue-router-auth` | criar rota, proteger rota, guard por role |
| `tailwind-vue-component` | criar componente Vue com Tailwind v4 |
| `vite-env-config` | env `VITE_*`, proxy do Vite, dev remoto |

Índice com exemplos de prompt: `.agents/skills/README.md`.

---

## 10. Referência rápida de comandos

```bash
# PocketBase local (baixa o binário 0.40.5 se não existir)
npm run dev:pb
# ou direto
cd pocketbase && ./pocketbase serve --http=0.0.0.0:8090

# validar migrations do zero
rm -rf pocketbase/pb_data        # Linux/macOS
cd pocketbase && ./pocketbase serve --http=127.0.0.1:8090
sqlite3 pocketbase/pb_data/data.db "SELECT file FROM _migrations ORDER BY file"

# build completo
npm run build && npm run preview

# imagem de produção
docker build -t app:latest .
docker compose up -d
```
