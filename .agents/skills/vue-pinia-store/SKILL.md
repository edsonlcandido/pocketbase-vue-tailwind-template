---
name: vue-pinia-store
description: Criar stores Pinia no padrão do template pocketbase-vue-tailwind — setup store (defineStore com setup function), integração com pb.authStore.onChange, tipagem com os tipos gerados pelo PB e tratamento de loading/error em toda action. Use quando o usuário quiser adicionar gerenciamento de estado (store de posts, produtos, carrinho, UI) seguindo as convenções do projeto.
---

# Vue 3 + Pinia — padrão de store

O template usa **setup stores** (Composition API), não Options API. Referência canônica do repo: `apps/web/src/stores/auth.ts`.

## Estrutura canônica

```ts
// apps/web/src/stores/<nome>.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '../services/pocketbase'
import type { RecordModel } from 'pocketbase'

export const usePostsStore = defineStore('posts', () => {
  // ---- state
  const items = ref<RecordModel[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ---- getters
  const count = computed(() => items.value.length)

  // ---- actions
  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const res = await pb.collection('posts').getList(1, 50, { sort: '-created' })
      items.value = res.items
    } catch (e: any) {
      error.value = e?.message || 'Falha ao buscar posts'
    } finally {
      loading.value = false
    }
  }

  async function create(data: { title: string; body: string }) {
    return pb.collection('posts').create(data)
  }

  return { items, loading, error, count, fetchAll, create }
})
```

## Regras do template

1. ✅ `ref` + `computed` + funções nomeadas (setup store).
2. ✅ **Retornar tudo explicitamente** no final — quem consome desestrutura.
3. ✅ Importar o client com caminho **relativo**: `import pb from '../services/pocketbase'`.
   > Não existe alias `@/` no `apps/web/tsconfig.json`. Use relativos (`../services/pocketbase`).
4. ❌ Não usar `state: () => ({ ... })` (sintaxe antiga do Pinia).
5. ❌ Não mutar `pb.authStore.model` direto — use `pb.authStore.onChange`.

## Reatividade com o authStore

```ts
pb.authStore.onChange((_token, model) => {
  currentUserId.value = model?.id ?? null
})
```

> `onChange` dispara em **todo** login/logout/refresh. Use pra espelhar estado, **não** pra buscar dados — a validação do token é do router guard (`authRefresh()`), e o login/logout é da `useAuthStore`.

## Service layer (recomendado)

Para coleções com regras de acesso ou lógica, iscule a chamada no service e deixe a store orquestrar estado:

```
apps/web/src/
├── services/
│   ├── pocketbase.ts       # client PB (instância única)
│   └── posts.ts            # funções que falam com o PB
├── stores/
│   └── posts.ts            # estado + actions
```

```ts
// apps/web/src/services/posts.ts
import pb from './pocketbase'

export async function listPosts() {
  return pb.collection('posts').getList(1, 20, { sort: '-created' })
}

export async function createPost(data: { title: string; body: string }) {
  return pb.collection('posts').create(data)
}
```

```ts
// apps/web/src/stores/posts.ts
import { listPosts, createPost } from '../services/posts'
```

## Tipagem com o PB

O PB gera `pocketbase/pb_data/types.d.ts` em runtime (é versionado no git — **não edite à mão**, rode o PB pra regenerar).

```ts
import type { PostsRecord } from '../../../pocketbase/pb_data/types'

const res = await pb.collection('posts').getList<PostsRecord>(1, 20)
```

> Caminho relativo é frágil. Alternativa: configurar alias no `apps/web/tsconfig.json`:
> ```json
> { "compilerOptions": { "paths": { "@pb-types/*": ["../../pocketbase/pb_data/types.d.ts"] } } }
> ```

## Consumindo em um componente

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { usePostsStore } from '../stores/posts'

const posts = usePostsStore()
onMounted(() => posts.fetchAll())
</script>

<template>
  <div v-if="posts.loading">Carregando...</div>
  <p v-else-if="posts.error" class="text-red-600">{{ posts.error }}</p>
  <ul v-else>
    <li v-for="p in posts.items" :key="p.id">{{ p.title }}</li>
  </ul>
</template>
```

## Cache & invalidação

O template **não usa cache** por padrão. Padrão útil quando a store é consultada em várias telas:

```ts
async function fetchAll(force = false) {
  if (!force && items.value.length && lastFetch.value && Date.now() - lastFetch.value < 30_000) return
  const res = await listPosts()
  items.value = res.items
  lastFetch.value = Date.now()
}

// após uma mutation, invalida
async function create(data) {
  const created = await createPost(data)
  await fetchAll(true)
  return created
}
```

## Checklist pra store nova

- [ ] Arquivo em `apps/web/src/stores/<nome>.ts`
- [ ] Exporta `use<Nome>Store`
- [ ] Tipos do PB (ou interface local) — nunca `any` solto
- [ ] `loading` + `error` tratados em **toda** action async (`try/catch/finally`)
- [ ] Não chama `authRefresh()` na store (é do router)
- [ ] Não chama `pb.collection('users').create()` sem regra de create — cria pelo `users` só se a rule permitir
- [ ] `npm run build:web` verde (vue-tsc é estrito: `noUnusedLocals` pega sobra)

## Anti-padrões

| ❌ Não fazer | ✅ Fazer |
|---|---|
| `state: () => ({ items: [] })` | `const items = ref<...>([])` |
| `this.items` | `items.value` |
| mutar `pb.authStore` direto | `auth.login()` / `auth.logout()` |
| `any` no payload/retorno | tipo do PB ou interface local |
| `watchEffect` sincronizando auth | `pb.authStore.onChange` |
| import de `@/services/pocketbase` | `../services/pocketbase` (não há alias) |
