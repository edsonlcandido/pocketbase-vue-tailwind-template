---
name: vue-pinia-store
description: Criar Pinia stores no padrão do template pocketbase-vue-tailwind — Setup/Composition API style com `defineStore('name', () => {...})`, integração com `pb.authStore.onChange` e tipagem de Records. Use quando o usuário quiser adicionar gerenciamento de estado (ex: store de posts, produtos, UI) seguindo as convenções do projeto.
---

# Vue 3 + Pinia — Store Pattern

O template usa **Composition API stores** (não Options API) com tipagem vinda do PocketBase. Veja `apps/web/src/stores/auth.ts` como referência canônica.

## 🏛️ Padrão arquitetural: Service Layer (leia antes)

Stores **nunca** falam com `pb.collection()` ou `pb.send()` direto. A única camada autorizada a tocar o backend é o **service** (`features/<x>/services/<x>.service.ts`).

```
component / store
        ↓
  service.ts           ← única camada que fala com o backend
        ↓
   PocketBase (CRUD direto OU hook custom via /api/...)
```

**Por quê** (Padrão 1 da [Arquitetura Recomendada](../../README.md#-arquitetura-recomendada)):
- Trocar de stack = reescrever 1 arquivo por feature
- Validação/normalização centralizada
- Auditabilidade

**Como o service se divide** (Padrão 2):
- Operações **single-collection CRUD padrão** → `pb.collection().X()` direto no service
- Operações **multi-collection / efeito externo / validação complexa** → `pb.send('/api/...')` → hook custom no PB

A store abaixo está errada. **A forma correta vem na seção seguinte.**

```ts
// ❌ ERRADO: store fala com pb direto
export const usePostsStore = defineStore('posts', () => {
  async function fetchAll() {
    const res = await pb.collection('posts').getList()  // ← não
  }
})
```

```ts
// ✅ CERTO: store fala com service
import { postsService } from '../services/posts.service'

export const usePostsStore = defineStore('posts', () => {
  async function fetchAll() {
    const res = await postsService.list()  // ← sim
  }
})
```

> 📖 Detalhes do service (estrutura, quando usar hook custom, exemplos completos) na skill [`pocketbase-collections`](../pocketbase-collections/SKILL.md).

## Estrutura canônica

```ts
// apps/web/src/stores/<nome>.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { postsService } from '../services/posts.service'  // ← service, nunca pb direto
import type { PostsRecord } from '@pb-types'              // ← tipo do PB, nunca any

export const usePostsStore = defineStore('posts', () => {
  // ---- state (refs)
  const items = ref<PostsRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ---- getters
  const count = computed(() => items.value.length)

  // ---- actions — falam com o service, não com o pb
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

  async function create(data: Partial<PostsRecord>) {
    const created = await postsService.create(data)
    items.value.push(created)
    return created
  }

  return { items, loading, error, count, fetchAll, create }
})
```

E o service correspondente (referência — completo na skill [`pocketbase-collections`](../pocketbase-collections/SKILL.md)):

```ts
// apps/web/src/features/posts/services/posts.service.ts
import pb from '@/shared/services/pocketbase'
import type { PostsRecord } from '@pb-types'

export const postsService = {
  async list(page = 1, perPage = 50) {
    return pb.collection('posts').getList<PostsRecord>(page, perPage, { sort: '-created' })
  },
  async create(data: Partial<PostsRecord>) {
    return pb.collection('posts').create<PostsRecord>(data)
  },
  // ...
}
```

Regras do template:
1. ✅ Usar `ref` + `computed` + funções nomeadas
2. ✅ Retornar **tudo** explicitamente no final (o template espera desestruturação)
3. ✅ Importar pb de `@/services/pocketbase`
4. ❌ Não usar `state: () => ({})` (sintaxe antiga do Pinia)
5. ❌ Não mutar `pb.authStore.model` direto — usar `pb.authStore.onChange`

## Padrão reativo com authStore (estilo do template)

Se sua store depende do usuário atual, sincronize com `pb.authStore.onChange`:

```ts
pb.authStore.onChange((_token, model) => {
  currentUserId.value = model?.id ?? null
})
```

> ⚠️ `pb.authStore.onChange` é chamado **sempre** que o token/user muda (login/logout/refresh). Não usar pra carregar dados — usar `pb.collection('users').authRefresh()` no router guard (já configurado).

## Tipagem com PB gerado

Edite `apps/web/tsconfig.json` pra apontar o alias:

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

Depois:

```ts
import type { PostsRecord } from '@pb-types'
```

Re-rodar `npm run dev:web` (ou `npm run dev:pb` em outro terminal) regenera `types.d.ts`.

## Consumindo em um componente

```vue
<script setup lang="ts">
import { usePostsStore } from '@/stores/posts'
import { onMounted } from 'vue'

const posts = usePostsStore()
onMounted(() => posts.fetchAll())
</script>

<template>
  <div v-if="posts.loading">Carregando...</div>
  <ul v-else>
    <li v-for="p in posts.items" :key="p.id">{{ p.title }}</li>
  </ul>
</template>
```

## Cache & invalidação

O template **não usa cache** por padrão. Padrões úteis:

```ts
async function fetchAll(force = false) {
  if (!force && items.value.length && lastFetch.value && Date.now() - lastFetch.value < 30_000) return
  // ... fetch real ...
  lastFetch.value = Date.now()
}

// refresh depois de mutations
async function create(data) {
  const created = await pb.collection('posts').create(data)
  await fetchAll(true)
  return created
}
```

## Checklist pra adicionar uma store nova

1. Criar `apps/web/src/stores/<nome>.ts`
2. Exportar `use<Nome>Store`
3. Usar tipos do PB (não `any`)
4. Tratar `loading` + `error` em **toda** ação async
5. Não chamar `pb.collection().authRefresh()` na store — isso é responsabilidade do router

## Anti-padrões

| ❌ Não fazer | ✅ Fazer |
|---|---|
| `state: () => ({ items: [] })` | `const items = ref<...>([])` |
| `this.items` | `items.value` |
| Mutação direta de `pb.authStore` | Chamar `auth.login()` ou `auth.logout()` |
| `any` no payload/retorno | Tipo do PB ou interface local |
| `watchEffect` sincronizando auth | `pb.authStore.onChange` |
| **Store fala com `pb.collection()` direto** | **Store fala com `*.service.ts`** |
