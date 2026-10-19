---
name: pocketbase-collections
description: Criar e estender collections do PocketBase neste template — schema via migration JS (PB 0.40+), regras de acesso (listRule/viewRule/createRule/updateRule/deleteRule), hooks de evento, tipos TypeScript gerados e índices. Use quando o usuário quiser adicionar uma collection nova, ajustar permissões de acesso, criar índice, gerar tipos do PB ou escrever um hook de evento (onRecordAfterCreateRequest, etc).
---

# PocketBase — Collections, permissões e hooks

PocketBase é o backend do template: dados, auth e API REST. Tudo passa pelo admin (`/_/`) + migrations JS em `pocketbase/pb_migrations/` + hooks em `pocketbase/pb_hooks/`.

## Onde ficam as coisas

```
pocketbase/
├── pb_data/
│   ├── data.db             # SQLite principal (estado real)
│   └── types.d.ts          # ⚡ gerado pelo PB em runtime (não editar à mão)
├── pb_migrations/          # migrations JS — versionadas no git
├── pb_hooks/
│   └── main.pb.js          # hook existente: SPA routing em /app/{path...}
└── pb_public/              # estáticos servidos pelo PB
```

> **Regra de ouro:** toda mudança de schema vai como **migration** em `pb_migrations/` e é **commitada**. O Admin UI serve pra explorar e pra criar collection rápido — mas o que reconstrói o banco em qualquer ambiente é a migration.

---

## Criar uma collection

### Opção A — Admin UI (rápido,_exporta depois)

1. `http://localhost:8090/_/` → *New collection* → tipo *base*.
2. Configure os campos e as regras de acesso.
3. **Exporte**: botão de download da collection → gera um arquivo em `pb_migrations/`.
4. Renomeie com timestamp: `mv 123456789_posts.js pocketbase/pb_migrations/`.

### Opção B — migration escrita à mão

```js
// pocketbase/pb_migrations/1700000000_create_posts.js
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = new Collection({
    name: "posts",
    type: "base",
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { name: "title", type: "text", max: 200, required: true },
      { name: "body", type: "editor", required: false },
      { name: "author", type: "relation", required: true,
        collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true },
      { name: "published", type: "bool", required: false },
      { name: "tags", type: "relation", required: false,
        collectionId: "<id-da-collection-tags>", maxSelect: 10 },
    ],
    indexes: [
      "CREATE INDEX idx_posts_author ON posts (author)",
    ],
  })
  app.save(collection)
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("posts"))
  } catch {}
})
```

> ⚠️ **PB 0.40+**: as opções do field vão **diretas no field** (`values`, `collectionId`, `maxSelect`, `cascadeDelete`…), **nunca** dentro de `options: {}`. E `fields: [...]` (não `schema: [...]`).
> Detalhes completos (idempotência, teste local, tabela de erros): `.agents/skills/pocketbase-migrations/SKILL.md`.

### Relations

- Relation pra `users`: `collectionId: "_pb_users_auth_"` (id do sistema).
- Relation pra outra collection: use o **id** da collection alvo.
- `cascadeDelete: true` → deletar o pai deleta os filhos.
- `maxSelect: 1` = relação única (many-to-one); `maxSelect: N` = N.

---

## Regras de acesso

Cada regra é uma expressão avaliada pelo PB por requisição. `null` = **acesso público**.

| Contexto | Expressão |
|---|---|
| Qualquer usuário logado | `@request.auth.id != ''` |
| Só o dono do record | `@request.auth.id = author.id` |
| Admin | `@request.auth.collectionName = "users"` (PB 0.23+) |
| Superuser | `@request.auth.superusers = true` (PB 0.23+) |
| Sem regra (sem auth) | `null` (público — cuidado!) |

### Padrão recomendado pra este template

| Collection | List | View | Create | Update | Delete |
|---|---|---|---|---|---|
| `posts` | logado | logado | `author = @request.auth.id` | `author = @request.auth.id` | `author = @request.auth.id` |
| `users` | só o próprio | só o próprio | admin | o próprio | admin |
| `posts_public` | público | público | logado | dono | admin |

> `updateRule`/`deleteRule` em `null` = **qualquer pessoa logada** edita/apaga. Nunca deixe em `null` sem pensar.

### Fields extras no usuário

A collection `users` já existe (auth nativo). **Não duplique.** Pra campos extras (plano, empresa, avatar), crie uma collection `profiles` com relation 1-1 pra `users`:

```js
{ name: "user", type: "relation", required: true,
  collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true }
```

---

## Hooks

Já existe um hook crítico em `pb_hooks/main.pb.js`:

```js
routerAdd("GET", "/app/{path...}", $apis.static("pb_public/app", true))
```

> ⚠️ O `true` (SPA fallback) é obrigatório. **Não remover.**

### Criar hook de evento

```js
// pocketbase/pb_hooks/posts.pb.js
/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateRequest((e) => {
  if (e.collection.name !== "posts") return
  console.log("📝 novo post:", e.record.getString("title"))
  // ex.: enviar email, invalidar cache, chamar webhook externo
})
```

Hooks disponíveis:

| Hook | Quando roda |
|---|---|
| `onRecordBeforeCreateRequest` | antes de gravar — pode bloquear/alterar |
| `onRecordAfterCreateRequest` | depois de gravar — efeito colateral |
| `onRecordBeforeUpdateRequest` | antes de atualizar |
| `onRecordAfterUpdateRequest` | depois de atualizar |
| `onRecordBeforeDeleteRequest` | antes de deletar |
| `onRecordAfterDeleteRequest` | depois de deletar |
| `onRecordEnrich` | adiciona campos virtuais na resposta |
| `onMailerSend` | intercepta o envio de email do PB |
| `onBootstrap` | roda 1x no boot do PB (seed de dados, etc.) |

> **Pegadinha:** em `onRecordAfter*` **não** chame `e.next()` (é no-op silencioso) e **não** tente `$app.dao().saveRecord()` pra alterar o record (a transação descarta). Detalhes em `.agents/skills/pocketbase-jsvm/SKILL.md`.

---

## Tipos TypeScript

O PB gera `pocketbase/pb_data/types.d.ts` em runtime. Ele é versionado no git — **não edite à mão**: rode o PB (`npm run dev:pb`) e ele regenera.

O arquivo é versionado pra dar autocomplete no IDE. Em `apps/web/tsconfig.json` não há alias configurado, então importe pelo caminho relativo:

```ts
// apps/web/src/stores/posts.ts
import pb from '../services/pocketbase'
import type { PostsRecord } from '../../../pocketbase/pb_data/types'

export async function listPosts() {
  return pb.collection('posts').getList<PostsRecord>(1, 20)
}
```

> O caminho relativo é frágil. Alternativa: configurar `paths` no `apps/web/tsconfig.json`:
> ```json
> { "compilerOptions": { "paths": { "@pb-types/*": ["../../pocketbase/pb_data/types.d.ts"] } } }
> ```
> Depois: `import type { PostsRecord } from '@pb-types'`.

---

## Consumindo no Vue

```ts
// apps/web/src/stores/posts.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import pb from '../services/pocketbase'

export const usePostsStore = defineStore('posts', () => {
  const items = ref<any[]>([])

  async function fetchAll() {
    const res = await pb.collection('posts').getList(1, 50, { sort: '-created' })
    items.value = res.items
  }

  async function create(data: { title: string; body: string }) {
    return pb.collection('posts').create(data)
  }

  return { items, fetchAll, create }
})
```

Detalhes de padrão de store: `.agents/skills/vue-pinia-store/SKILL.md`.

---

## Índices

Crie índice pra todo campo que você filtra/ordena com frequência:

```js
indexes: [
  "CREATE INDEX idx_posts_author ON posts (author)",
  "CREATE INDEX idx_posts_created ON posts (created)",
]
```

Índice unique quando o valor tem que ser único:

```js
"CREATE UNIQUE INDEX idx_posts_slug ON posts (slug)"
```

> Migration com `CREATE UNIQUE INDEX` **falha** se já existirem dados duplicados na tabela. Migre os dados antes (numa migration anterior) ou trate o erro.

---

## Debug

- `console.log` em hook aparece no stdout do processo do PB (terminal do `npm run dev:pb` ou log do container).
- Admin UI em `/_/` mostra as collections e as regras de acesso já em vigor.
- `pb_data/types.d.ts` é o reflexo do schema — se a collection não aparecer lá, o PB não subiu com a migration aplicada.

## Dicas

- `pb_migrations/*.js` vai pro git → o PB aplica sozinho no boot de qualquer ambiente.
- Seed de dados: collection `settings` ou hook `onBootstrap`.
- Backup: `pb_data/data.db` é o estado inteiro — versionar `pb_migrations/` reconstrói o **schema**, os **dados** só voltam de backup.
