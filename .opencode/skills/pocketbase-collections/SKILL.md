---
name: pocketbase-collections
description: Criar, migrar e estender collections/hooks do PocketBase no template — incluindo geração de tipos TS, regras de acesso e hooks JS/JSDoc. Use quando o usuário quiser adicionar uma collection nova, ajustar permissões, criar uma migration ou escrever um hook de evento.
---

# PocketBase — Collections, Migrations e Hooks

PocketBase é o backend do template. Tudo passa pelo admin (`/_/`) + JS hooks em `pocketbase/pb_hooks/`.

## 🏛️ Alinhamento com Arquitetura Recomendada

Esta skill é a **implementação dos Padrões 2 e 3** da [Arquitetura Recomendada](../../README.md#-arquitetura-recomendada):

| Padrão | Aplicação nesta skill |
|---|---|
| 2 — Service thin + hook | Define onde mora cada tipo de lógica (CRUD vs multi-collection). Service no front é thin wrapper; hooks PB pra lógica complexa. |
| 3 — Backend é a verdade | Toda collection **deve** ter `listRule`/`viewRule`/`createRule`/`updateRule`/`deleteRule` definidos. Front só esconde UI por UX, nunca por segurança. |

> ⚠️ **Mudança conceitual**: collection rules **não são opcionais**. Antes desta skill dizia "recomendado pra esse template". Agora é **obrigatório** em produção multi-user. Collection com `null` nas rules = acesso público irrestrito. Não vai pra prod assim.

## Localização dos arquivos

```
pocketbase/
├── pb_data/
│   ├── data.db             # SQLite principal
│   └── types.d.ts          # ⚡ gerado pelo PB em runtime (NÃO editar)
├── pb_migrations/          # SQL/JS de migração — versionadas no git
├── pb_hooks/
│   └── main.pb.js          # hook já existente: SPA routing em /app/{path...}
└── pb_public/              # arquivos estáticos servidos (vite build output)
```

> **Regra de ouro**: sempre que criar/alterar collections, gere uma migration em `pb_migrations/` (`*.js` exportando `migrate()`). Cole no git.

## Criar uma collection (workflow)

1. **Admin visual**: abra `http://localhost:8090/_/`, crie a collection, configure campos/permissions.
2. **Migration JS**: baixe os JSONs de schema via `pb_migrations/` snapshot do admin (botão "Save as migration") ou escreva manualmente:

```js
// pocketbase/pb_migrations/1700000000_create_posts.js
/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const collection = new Collection({
    name: 'posts',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true, max: 200 },
      { name: 'body',  type: 'editor' },
      { name: 'author', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'published', type: 'bool' },
    ],
    indexes: ['CREATE INDEX idx_posts_author ON posts (author)'],
  })
  return Dao(db).saveCollection(collection)
}, (db) => {
  return Dao(db).deleteCollection('posts')
})
```

3. **Tipos TS**: o PB gera `pb_data/types.d.ts` em runtime. Pra forçar: rode `npm run dev:pb` por 1-2s e olhe o arquivo.

## Regras de acesso (OBRIGATÓRIO)

Toda collection nova **deve** ter as 5 regras (`listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`) explicitamente definidas — nunca `null` em produção multi-user. `null` = público irrestrito.

### Templates prontos

**SaaS multi-user (dono-edita-seus-dados)** — caso mais comum:

```js
listRule:   "author = @request.auth.id",      // vê só os próprios
viewRule:   "author = @request.auth.id || @request.auth.isAdmin",  // admin vê tudo
createRule: "@request.auth.id != ''",         // qualquer logado cria
updateRule: "author = @request.auth.id",      // só dono edita
deleteRule: "author = @request.auth.id",      // só dono deleta
```

**Conteúdo público (blog, docs, landing)** — leitura aberta, escrita fechada:

```js
listRule:   "status = \"published\" || @request.auth.isAdmin",
viewRule:   "status = \"published\" || @request.auth.isAdmin",
createRule: "@request.auth.id != ''",          // logado pode criar (vai pra draft)
updateRule: "author = @request.auth.id || @request.auth.isAdmin",
deleteRule: "@request.auth.id.isAdmin || author = @request.auth.id",
```

**Admin-only (audit log, settings, métricas)** — ninguém vê, exceto admin:

```js
listRule:   "@request.auth.isAdmin",
viewRule:   "@request.auth.isAdmin",
createRule: "",                                // vazio = ninguém cria via API
updateRule: "@request.auth.isAdmin",
deleteRule: "@request.auth.isAdmin",
```

> 💡 Para `createRule: ""` em audit_log (append-only), criar via hook server-side com `$app.dao().saveRecord()` (sem check de rule).

**Team/multi-tenant (time vê dados do time)** — Padrão 4 aplicado:

```js
listRule:   "team = @request.auth.team",
viewRule:   "team = @request.auth.team",
createRule: "@request.auth.id != '' && team = @request.auth.team",
updateRule: "(team = @request.auth.team) && (author = @request.auth.id || @request.auth.isAdmin)",
deleteRule: "@request.auth.isAdmin",
```

### Onde aplicar

**Via migration JS** (preferido, versionado no git):

```js
const collection = new Collection({
  name: 'posts',
  type: 'base',
  schema: [/* ... */],
  listRule:   "author = @request.auth.id",
  viewRule:   "author = @request.auth.id || @request.auth.isAdmin",
  createRule: "@request.auth.id != ''",
  updateRule: "author = @request.auth.id",
  deleteRule: "author = @request.auth.id || @request.auth.isAdmin",
})
```

**Via admin UI** (debug local): `/_/` → editar collection → abas "Access rules". Sempre replicar pra migration depois (git é a fonte da verdade).

### Checklist obrigatório por collection

Antes de commitar uma migration com collection nova:

- [ ] `listRule` definido (não `null`)
- [ ] `viewRule` definido (não `null`)
- [ ] `createRule` definido (não `null`)
- [ ] `updateRule` definido (não `null`)
- [ ] `deleteRule` definido (não `null`)
- [ ] `@request.auth.isAdmin` adicionado onde admin precisa bypass
- [ ] Regras cobertas pelo hook server-side validam campos críticos (ex: `onRecordBeforeCreateRequest` pra validar invariantes)
- [ ] Testado: tenta `curl` sem token / com user errado → **deve** dar 401/403/404
- [ ] Migration tem campos `created` + `updated` (Padrão JSVM: UI cria auto, JSVM não)

### Anti-pattern: regras permissivas demais

| ❌ Errado | Por que | ✅ Certo |
|---|---|---|
| `listRule: null` | público irrestrito | `"author = @request.auth.id"` |
| `createRule: null` | qualquer um cria | `"@request.auth.id != ''"` |
| `deleteRule: null` | qualquer um deleta | `"author = @request.auth.id \|\| @request.auth.isAdmin"` |
| Confiar só em hook | hook roda, mas list já vazou | collection rules + hook (defense in depth) |
| Regras só no front | burlável via curl/Postman | regras **sempre** no PB |


## Hooks

Já existe um hook crítico em `pb_hooks/main.pb.js`:

```js
routerAdd("GET", "/app/{path...}", $apis.static("pb_public/app", true))
```

> ⚠️ O `true` ativa `indexFallback` — obrigatório pra SPA routing do Vue Router. **Não remover.**

### Criar novo hook

```js
// pocketbase/pb_hooks/posts.pb.js
/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateRequest((e) => {
  if (e.collection.name !== 'posts') return
  console.log('📝 novo post:', e.record.getString('title'))
  // ex: mandar email, invalidar cache, chamar webhook externo
}, $app)
```

Tipos comuns de hook:
- `onRecordBeforeCreateRequest` — bloquear/alterar antes de gravar
- `onRecordAfterCreateRequest` — efeito colateral depois
- `onRecordBeforeUpdateRequest` — validar update
- `onRecordEnrich` — adicionar campos virtuais
- `onMailerSend` — interceptar envio de email

> Hooks são recarregados automaticamente pelo PB quando você salva o arquivo. Não precisa reiniciar.

## Consumindo no Vue (TS tipado, via service layer)

> 📖 **Service layer é obrigatório** (Padrão 1 da Arquitetura Recomendada). Store/componente **nunca** fala com `pb` direto. Sempre passa por `*.service.ts`.

### Estrutura recomendada (vertical slice por feature)

```
apps/web/src/features/<feature>/
├── components/
├── stores/<feature>.store.ts        ← consome o service
├── services/<feature>.service.ts    ← única camada que fala com pb
├── composables/
├── views/
└── index.ts                          ← controla o que vaza
```

### Configurar alias `@pb-types` (uma vez)

No `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@pb-types/*": ["../../pocketbase/pb_data/types.d.ts"]
    }
  }
}
```

> Rodar `npm run dev:pb` por 1-2s em outro terminal regenera `types.d.ts`.

### Service (camada que fala com pb)

```ts
// apps/web/src/features/posts/services/posts.service.ts
import pb from '@/shared/services/pocketbase'
import type { PostsRecord } from '@pb-types'

export const postsService = {
  // CRUD — Padrão 1 + 2 (thin wrapper)
  async list(page = 1, perPage = 20) {
    return pb.collection('posts').getList<PostsRecord>(page, perPage)
  },
  async getById(id: string) {
    return pb.collection('posts').getOne<PostsRecord>(id)
  },
  async create(data: Partial<PostsRecord>) {
    return pb.collection('posts').create<PostsRecord>(data)
  },
  async update(id: string, data: Partial<PostsRecord>) {
    return pb.collection('posts').update<PostsRecord>(id, data)
  },
  async delete(id: string) {
    return pb.collection('posts').delete(id)
  },

  // Lógica avançada — Padrão 2 (endpoint custom no PB)
  async publish(id: string) {
    return pb.send(`/api/posts/${id}/publish`, { method: 'POST' })
  },
}
```

### Store (consome o service)

```ts
// apps/web/src/features/posts/stores/posts.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postsService } from '../services/posts.service'
import type { PostsRecord } from '@pb-types'

export const usePostsStore = defineStore('posts', () => {
  const items = ref<PostsRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const res = await postsService.list()
      items.value = res.items
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Falha ao buscar posts'
    } finally {
      loading.value = false
    }
  }

  async function publish(id: string) {
    const updated = await postsService.publish(id)
    const i = items.value.findIndex(p => p.id === id)
    if (i >= 0) items.value[i] = updated
  }

  return { items, loading, error, fetchAll, publish }
})
```

### Anti-patterns de consumo

| ❌ Errado | ✅ Certo |
|---|---|
| `pb.collection('posts').getList()` em store | `postsService.list()` em store |
| Tipo `RecordModel` (genérico) | Tipo `PostsRecord` (do PB, via `@pb-types`) |
| `any` no payload/retorno | Tipo do PB ou interface local |
| Path relativo `../../../pocketbase/...` | Alias `@pb-types` |
| Componente chama `pb.collection()` direto | Componente → store → service → pb |


## Deploy com collections/migrações

- `pb_migrations/*.js` vai pro git → em produção o PB aplica automaticamente na startup.
- Dados seed: criar collection `settings` ou usar `pb_hooks/main.pb.js` com `onBootstrap`.

## Dicas

- Debug: `console.log` em hooks aparece no terminal do `npm run dev:pb`.
- Performance: crie índices SQL em `indexes` da migration pra campos filtrados.
- Backup: `pb_data/data.db` é o estado inteiro — versionar `pb_migrations/` é o suficiente pra reconstruir.
- Auth: a collection `users` existe por padrão; **não duplicar**. Pra campos extras, é melhor uma collection `profiles` linkada por `relation`.
