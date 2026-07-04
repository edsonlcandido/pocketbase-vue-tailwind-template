---
name: domain-feature-scaffold
description: Como bootstrap uma feature nova no template seguindo os 5 padrões da Arquitetura Recomendada — vertical slice (features/<x>/), service layer, collection rules obrigatórias, types do PB, e service thin + hook quando precisar. Use quando o usuário quiser adicionar uma feature end-to-end (ex: 'adicionar feature de eventos', 'criar módulo de inventário') e quiser um workflow consistente desde o schema até a UI.
---

# Domínio — Feature Scaffold (bootstrap seguindo os 5 padrões)

Esta skill é a **receita** pra adicionar uma feature nova no template **do zero até a UI navegável**, sempre respeitando os 5 padrões da [Arquitetura Recomendada](../../README.md#-arquitetura-recomendada).

> 📖 Combine com [`evolution-roadmap`](../evolution-roadmap/SKILL.md) pra entender quando usar (Fase 2).

## Inputs da skill

Antes de começar, defina:

```markdown
## Feature: [nome]
## Collection(s): [1-3 collections com campos principais]
## Quem cria / vê / edita: [ex: dono; time; admin]
## Lógica cross-collection? [sim/não — ex: ao criar X, criar Y também]
## Integração externa? [ex: Stripe, email, webhook]
## UI mínima: [1 listagem + 1 form + 1 detalhe]
```

Se você não consegue responder isso, **volte e entenda o problema**. Esta skill não compensa falta de design.

## Outputs da skill

Estrutura completa criada:

```
apps/web/src/features/<feature>/
├── components/
│   └── <Item>Card.vue          # ex: EventCard.vue
├── stores/
│   └── <feature>.store.ts      # consome service
├── services/
│   └── <feature>.service.ts    # única camada que fala com pb
├── composables/
│   └── use<Feature>Filters.ts  # opcional
├── views/
│   ├── <Feature>ListView.vue
│   └── <Feature>DetailView.vue
└── index.ts                     # exports públicos

pocketbase/
├── pb_migrations/
│   └── <timestamp>_create_<feature>.js
└── pb_hooks/
    └── <feature>.pb.js         # hooks custom (se precisar)
```

## Workflow (7 passos, na ordem)

### Passo 1 — Definir a collection (Padrão 3 + JSVM)

**Não pule isso.** Antes de UI, defina o schema:

```js
// pocketbase/pb_migrations/1700000000_create_events.js
/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  Dao(db).saveCollection(new Collection({
    name: 'events',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true, max: 200 },
      { name: 'description', type: 'editor' },
      { name: 'date', type: 'date', required: true },
      { name: 'location', type: 'text', max: 200 },
      { name: 'owner', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
      // Padrão JSVM: created/updated DEVEM ser criados manualmente
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_events_date ON events (date)',
      'CREATE INDEX idx_events_owner ON events (owner)',
    ],
    // Padrão 3: rules obrigatórias (SaaS multi-user)
    listRule:   "owner = @request.auth.id || @request.auth.isAdmin",
    viewRule:   "owner = @request.auth.id || @request.auth.isAdmin",
    createRule: "@request.auth.id != ''",
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id || @request.auth.isAdmin",
  }))
}, (db) => Dao(db).deleteCollection('events'))
```

**Checklist de migração (Padrão 3)**:
- [ ] Todos os 5 rules definidos (não `null`)
- [ ] `created` + `updated` adicionados manualmente (JSVM não auto-cria)
- [ ] Índices SQL nos campos que vão ser filtrados/ordenados
- [ ] `owner` (ou similar) presente se for SaaS multi-user

### Passo 2 — Rodar dev pra gerar types (Padrão 5)

```bash
# Em terminal separado, deixar rodando
npm run dev:pb
```

Depois de 1-2s, `pocketbase/pb_data/types.d.ts` é regenerado com `EventsRecord`. Confirme que existe.

**Configure o alias `@pb-types` uma vez** (se ainda não configurou):

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@pb-types/*": ["../../pocketbase/pb_data/types.d.ts"]
    }
  }
}
```

### Passo 3 — Criar o service (Padrão 1 + 2)

```ts
// apps/web/src/features/events/services/events.service.ts
import pb from '@/shared/services/pocketbase'
import type { EventsRecord } from '@pb-types'

export const eventsService = {
  // CRUD — Padrão 1 (thin wrapper)
  async list(page = 1, perPage = 50) {
    return pb.collection('events').getList<EventsRecord>(page, perPage, {
      sort: 'date',
    })
  },
  async getById(id: string) {
    return pb.collection('events').getOne<EventsRecord>(id)
  },
  async create(data: Partial<EventsRecord>) {
    return pb.collection('events').create<EventsRecord>(data)
  },
  async update(id: string, data: Partial<EventsRecord>) {
    return pb.collection('events').update<EventsRecord>(id, data)
  },
  async delete(id: string) {
    return pb.collection('events').delete(id)
  },

  // Lógica avançada — Padrão 2 (só se precisar)
  // Ex: ao cancelar evento, notificar participants via hook custom
  async cancel(id: string) {
    return pb.send(`/api/events/${id}/cancel`, { method: 'POST' })
  },
}
```

**Onde mora o service**:
- `apps/web/src/features/events/services/events.service.ts` se for feature nova
- `apps/web/src/shared/services/files.service.ts` se for utilitário compartilhado

### Passo 4 — Criar o store (Padrão 1 + 5)

```ts
// apps/web/src/features/events/stores/events.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventsService } from '../services/events.service'
import type { EventsRecord } from '@pb-types'

export const useEventsStore = defineStore('events', () => {
  // ---- state
  const items = ref<EventsRecord[]>([])
  const current = ref<EventsRecord | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ---- getters
  const upcoming = computed(() => {
    const now = new Date().toISOString()
    return items.value.filter(e => e.date >= now)
  })

  // ---- actions — SEMPRE via service
  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const res = await eventsService.list()
      items.value = res.items
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Falha ao buscar eventos'
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id: string) {
    current.value = await eventsService.getById(id)
  }

  async function create(data: Partial<EventsRecord>) {
    const created = await eventsService.create(data)
    items.value.push(created)
    return created
  }

  async function update(id: string, data: Partial<EventsRecord>) {
    const updated = await eventsService.update(id, data)
    const i = items.value.findIndex(e => e.id === id)
    if (i >= 0) items.value[i] = updated
    if (current.value?.id === id) current.value = updated
    return updated
  }

  async function remove(id: string) {
    await eventsService.delete(id)
    items.value = items.value.filter(e => e.id !== id)
    if (current.value?.id === id) current.value = null
  }

  return { items, current, loading, error, upcoming, fetchAll, fetchById, create, update, remove }
})
```

### Passo 5 — Views (componentes Vue)

#### List view

```vue
<!-- apps/web/src/features/events/views/EventsListView.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEventsStore } from '../stores/events.store'
import EventCard from '../components/EventCard.vue'

const events = useEventsStore()
const search = ref('')

onMounted(() => events.fetchAll())

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return events.items
  return events.items.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.location?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Eventos</h1>
      <router-link to="/events/new"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Novo evento
      </router-link>
    </header>

    <input v-model="search" placeholder="Buscar..."
      class="w-full mb-6 px-4 py-2 border rounded-lg" />

    <div v-if="events.loading" class="text-center py-12 text-gray-500">
      Carregando...
    </div>
    <div v-else-if="filtered.length === 0" class="text-center py-12 text-gray-500">
      Nenhum evento encontrado.
    </div>
    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <EventCard v-for="e in filtered" :key="e.id" :event="e" />
    </div>
  </div>
</template>
```

#### Card component

```vue
<!-- apps/web/src/features/events/components/EventCard.vue -->
<script setup lang="ts">
import type { EventsRecord } from '@pb-types'

defineProps<{ event: EventsRecord }>()
</script>

<template>
  <router-link :to="`/events/${event.id}`"
    class="block bg-white rounded-2xl shadow p-5 hover:shadow-lg transition">
    <h2 class="text-xl font-bold mb-2">{{ event.title }}</h2>
    <p class="text-sm text-gray-500 mb-1">
      📅 {{ new Date(event.date).toLocaleDateString('pt-BR') }}
    </p>
    <p v-if="event.location" class="text-sm text-gray-500">
      📍 {{ event.location }}
    </p>
  </router-link>
</template>
```

### Passo 6 — Adicionar rotas (auth guard já configurado)

```ts
// apps/web/src/router/index.ts (adicionar dentro do array routes)
{
  path: '/events',
  name: 'events',
  component: () => import('@/features/events/views/EventsListView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/events/new',
  name: 'events-new',
  component: () => import('@/features/events/views/EventFormView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/events/:id',
  name: 'event-detail',
  component: () => import('@/features/events/views/EventDetailView.vue'),
  meta: { requiresAuth: true },
  props: true,
},
```

> ⚠️ Path **sem** `/app/` — o `base: '/app/'` do Vite Router cuida.

### Passo 7 — Hook custom (só se Padrão 2 precisar)

Se a feature tem **lógica cross-collection ou efeito externo** (ex: ao cancelar evento, notificar participants), criar hook no PB:

```js
// pocketbase/pb_hooks/events.pb.js
/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/events/:id/cancel', async (e) => {
  const id = e.requestInfo().pathParams.id
  const event = $app.findRecordById('events', id)
  if (!event) return e.json(404, { error: 'not found' })
  if (event.getString('owner') !== e.auth?.id && !e.auth?.isAdmin) {
    return e.json(403, { error: 'forbidden' })
  }

  event.set('status', 'cancelled')
  $app.save(event)

  // Efeito externo: notificar participants
  // (exemplo com collection 'participants' relacionada)
  const participants = $app.findRecordsByFilter('participants', `event = "${id}"`)
  for (const p of participants) {
    // enviar email, etc.
  }

  return e.json(200, { ok: true })
}, $apis.requireAuth())
```

E no service (passo 3), o `cancel` já chama esse endpoint.

## `index.ts` da feature (controla o que vaza)

```ts
// apps/web/src/features/events/index.ts

// Páginas (vazam pro router)
export { default as EventsListView } from './views/EventsListView.vue'
export { default as EventDetailView } from './views/EventDetailView.vue'
export { default as EventFormView } from './views/EventFormView.vue'

// Store (vaza pra componentes que precisam)
export { useEventsStore } from './stores/events.store'

// NÃO exportar service, components internos, composables
// (mantém fronteira clara — outras features consomem só o que está aqui)
```

## Critérios de pronto

A feature está pronta quando:

- [ ] Migration commitada no git, com collection rules definidos
- [ ] Types regenerados (`@pb-types` aponta pra `EventsRecord`)
- [ ] Service criado em `features/<x>/services/`
- [ ] Store consome service, não `pb` direto
- [ ] View lista + view detalhe + view form funcionais
- [ ] Rota adicionada com `meta.requiresAuth` se precisar
- [ ] Try/catch em toda action async (sem `any`)
- [ ] Se tem lógica cross-collection: hook custom + endpoint
- [ ] Testado: tentar burlar via curl retorna 401/403/404 (collection rules OK)
- [ ] Testado: criar/editar/deletar pela UI funciona end-to-end
- [ ] `index.ts` da feature controla o que vaza

## Checklist anti-pattern (debug rápido)

Antes de commitar a feature nova, conferir:

- [ ] Nenhum `pb.collection()` em store ou componente (só no service)
- [ ] Nenhum `any` em type de store/service
- [ ] Nenhuma collection com rules `null`
- [ ] Nenhum `created`/`updated` faltando em migration
- [ ] Nenhum `require('fs')` em hook (JSVM não suporta)
- [ ] Nenhum segredo em `.env.local` commitado
- [ ] Nenhum `process.env.VITE_*` em componente (Vite usa `import.meta.env`)
- [ ] Store não chama `authRefresh()` (responsabilidade do router)

## Combinar com outras skills

Esta skill é o **workflow**. As outras skills dão o conteúdo específico:

| Quando... | Use... |
|---|---|
| Feature tem upload de arquivos | [`domain-storage-files`](../domain-storage-files/SKILL.md) |
| Feature tem realtime (multi-user live) | [`domain-realtime`](../domain-realtime/SKILL.md) |
| Feature envia emails transacionais | [`domain-email-hooks`](../domain-email-hooks/SKILL.md) |
| Feature tem múltiplos roles (admin/editor) | [`domain-rbac`](../domain-rbac/SKILL.md) |
| Feature cobra (planos/Stripe) | [`domain-saas-billing`](../domain-saas-billing/SKILL.md) |
| Dúvida de estrutura de pasta | [`vue-pinia-store`](../vue-pinia-store/SKILL.md) — Padrão 1, 4, 5 |
| Dúvida de collection rules | [`pocketbase-collections`](../pocketbase-collections/SKILL.md) — Padrão 3 |
| Dúvida de "faz no front ou no PB?" | [`evolution-roadmap`](../evolution-roadmap/SKILL.md) + o framework de 3 perguntas |

## Exemplo end-to-end

Referência: [`domain-crm-leads`](../domain-crm-leads/SKILL.md) é o resultado de rodar esta skill pra uma feature de CRM (leads + contacts + activities).
