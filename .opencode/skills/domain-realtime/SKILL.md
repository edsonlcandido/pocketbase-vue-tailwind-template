---
name: domain-realtime
description: Como usar PocketBase subscriptions pra construir features em tempo real (chat, kanban multi-user, dashboards live, presença online, notificações). Cobre pattern Pinia store + cleanup de subscriptions, hooks de broadcast e UX de loading. Use quando o usuário quiser que 2+ users vejam mudanças ao vivo, indicador "online", ou sincronizar estado entre clientes.
---

# Domínio — Realtime (subscriptions PocketBase)

PocketBase tem **subscriptions SSE** nativas. Cada client abre um stream e recebe `create/update/delete` em tempo real. Perfeito pra kanban multi-user, chat, presença, dashboards live.

## 🏛️ Alinhamento com Arquitetura Recomendada

Esta skill segue os 5 padrões da [Arquitetura Recomendada](../../README.md#-arquitetura-recomendada):

| Padrão | Aplicação nesta skill |
|---|---|
| 1 — Camada de Service | Subscribe via service helper (não chama `pb.collection().subscribe()` direto na store) |
| 2 — Service thin + hook | Subscriptions são CRUD-level (vão no service); presença/typing vão via hook custom |
| 3 — Backend é a verdade | Collection rules continuam aplicando — subscription só entrega o que o user pode ver |
| 4 — Vertical slicing | Realtime é transversal; o subscribe vive dentro do service de cada feature |
| 5 — Type-safety | Subscribe tipado com `<XxxRecord>` |

### Service layer desta skill

```ts
// apps/web/src/features/<feature>/services/<feature>.realtime.ts
import pb from '@/shared/services/pocketbase'
import type { CardsRecord } from '@pb-types'

export const cardsRealtime = {
  // Padrão 1: subscribe encapsulado no service (não na store)
  subscribe(handler: (e: { action: string; record: CardsRecord }) => void) {
    return pb.collection('cards').subscribe<CardsRecord>('*', handler)
  },

  // Padrão 2: presença/typing via endpoint custom
  async announcePresence(roomId: string) {
    return pb.send('/api/realtime/presence', {
      method: 'POST',
      body: JSON.stringify({ room: roomId }),
    })
  },
  async getOnlineUsers(roomId: string) {
    return pb.send(`/api/realtime/presence/${roomId}`)
  },
}
```

> 📖 Esta skill complementa `vue-pinia-store` (cleanup de subscriptions via `onUnmounted`).

## Conceito

```ts
// abre stream
const unsub = pb.collection('posts').subscribe('*', (e) => {
  console.log(e.action)  // 'create' | 'update' | 'delete'
  console.log(e.record)  // record completo
})

// fecha
unsub()
```

> ⚠️ **Sempre** guardar `unsub()` e chamar no `onUnmounted` da store/componente. Esquecer disso vaza conexão.

## Patterns Pinia (via service layer — Padrão 1)

### Service (encapsula subscribe + cleanup)

```ts
// apps/web/src/shared/services/realtime.service.ts
import pb from '@/shared/services/pocketbase'

export interface RealtimeEvent<T> {
  action: 'create' | 'update' | 'delete'
  record: T
}

export const realtimeService = {
  // Helper genérico tipado (Padrão 5)
  subscribe<T>(collection: string, handler: (e: RealtimeEvent<T>) => void): () => void {
    return pb.collection(collection).subscribe<T>('*', handler as (e: unknown) => void)
  },

  // Lógica avançada (Padrão 2) — presença/typing via hook custom
  async announcePresence(roomId: string) {
    return pb.send('/api/realtime/presence', {
      method: 'POST',
      body: JSON.stringify({ room: roomId }),
    })
  },
  async getOnlineUsers(roomId: string) {
    return pb.send(`/api/realtime/presence/${roomId}`)
  },
}
```

### Store (consome service, cleanup via `onUnmounted`)

```ts
// apps/web/src/features/kanban/stores/kanban.store.ts
import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'
import { cardsService } from '../services/cards.service'
import { realtimeService } from '@/shared/services/realtime.service'
import type { CardsRecord } from '@pb-types'

export const useKanbanStore = defineStore('kanban', () => {
  const cards = ref<CardsRecord[]>([])
  const loading = ref(false)
  let unsub: (() => void) | null = null

  async function load() {
    loading.value = true
    try {
      cards.value = await cardsService.listAll()
    } finally {
      loading.value = false
    }
  }

  function subscribe() {
    if (unsub) return
    unsub = realtimeService.subscribe<CardsRecord>('cards', (e) => {
      if (e.action === 'create') {
        cards.value.push(e.record)
      } else if (e.action === 'update') {
        const i = cards.value.findIndex(c => c.id === e.record.id)
        if (i >= 0) cards.value[i] = e.record
      } else if (e.action === 'delete') {
        cards.value = cards.value.filter(c => c.id !== e.record.id)
      }
    })
  }

  function unsubscribe() {
    if (unsub) { unsub(); unsub = null }
  }

  // cleanup automático se store for desmontado
  onUnmounted(() => unsubscribe())

  return { cards, loading, load, subscribe, unsubscribe }
})
```

> O service de cards (`cardsService.listAll()`) vive em `features/<feature>/services/cards.service.ts` — CRUD básico via `pb.collection()`. A subscribe fica no `realtimeService` compartilhado.

No view:

```vue
<script setup lang="ts">
import { useKanbanStore } from '@/features/kanban/stores/kanban.store'
import { onMounted } from 'vue'

const kb = useKanbanStore()
onMounted(async () => {
  await kb.load()
  kb.subscribe()
})
</script>
```

## Caso 1 — Kanban multi-user (mesma coleção do CRM)

Já feito na skill `domain-crm-leads`. Acréscimo realtime:

```ts
// dentro de stores/leads.ts
let unsub: (() => void) | null = null

function subscribe() {
  unsub?.()
  unsub = pb.collection('leads').subscribe('*', (e) => {
    if (e.action === 'create')   items.value.unshift(e.record)
    else if (e.action === 'update') {
      const i = items.value.findIndex(l => l.id === e.record.id)
      if (i >= 0) items.value[i] = e.record
    } else if (e.action === 'delete') {
      items.value = items.value.filter(l => l.id !== e.record.id)
    }
  })
}

function unsubscribe() { unsub?.(); unsub = null }
```

UX adicional — destacar mudanças:

```vue
<article :class="['p-3 rounded-lg transition-all',
  justUpdated.has(lead.id) ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white']">
```

```ts
// store
const justUpdated = ref(new Set<string>())
function markUpdated(id: string) {
  justUpdated.value.add(id)
  setTimeout(() => { justUpdated.value.delete(id); justUpdated.value = new Set(justUpdated.value) }, 1500)
}
```

## Caso 2 — Chat

### Schema

```js
// migration
Dao(db).saveCollection(new Collection({
  name: 'messages',
  type: 'base',
  schema: [
    { name: 'room',     type: 'relation', collectionId: 'rooms', maxSelect: 1, required: true, cascadeDelete: true },
    { name: 'author',   type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
    { name: 'body',     type: 'text', required: true, max: 2000 },
    { name: 'edited',   type: 'bool' },
  ],
  indexes: ['CREATE INDEX idx_msg_room ON messages (room, created)'],
}))
```

### Store

```ts
// stores/chat.ts
export const useChatStore = defineStore('chat', () => {
  const messages = ref<any[]>([])
  const draft = ref('')
  let unsub: (() => void) | null = null

  async function loadRoom(roomId: string) {
    unsub?.()
    messages.value = []
    messages.value = (await pb.collection('messages').getList(1, 100, {
      filter: `room = "${roomId}"`, sort: 'created',
    })).items
    unsub = pb.collection('messages').subscribe('*', (e) => {
      if (e.action === 'create' && e.record.room === roomId) {
        messages.value.push(e.record)
      }
    })
  }

  async function send(roomId: string, authorId: string) {
    if (!draft.value.trim()) return
    await pb.collection('messages').create({
      room: roomId, author: authorId, body: draft.value,
    })
    draft.value = ''
  }

  onUnmounted(() => unsub?.())

  return { messages, draft, loadRoom, send }
})
```

### Hook PB — broadcast pra autor da mensagem que foi entregue

```js
// pb_hooks/messages.pb.js
onRecordAfterCreateRequest((e) => {
  if (e.collection.name !== 'messages') return
  // marca como entregue (campo opcional)
  // ou: dispara webhook pra push notification
  $app.dao().saveRecord(e.record) // ok
}, $app)
```

### View

```vue
<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ roomId: string }>()
const chat = useChatStore()
const auth = useAuthStore()
const scroller = ref<HTMLElement>()

onMounted(async () => {
  await chat.loadRoom(props.roomId)
  scrollToBottom()
})

async function send() {
  await chat.send(props.roomId, auth.user!.id)
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' }))
}
</script>

<template>
  <div class="flex flex-col h-[600px] bg-white rounded-2xl shadow">
    <div ref="scroller" class="flex-1 overflow-y-auto p-4 space-y-2">
      <div v-for="m in chat.messages" :key="m.id"
        :class="['max-w-[70%] rounded-2xl px-4 py-2',
          m.author === auth.user?.id ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100']">
        {{ m.body }}
      </div>
    </div>
    <form @submit.prevent="send" class="flex gap-2 p-3 border-t">
      <input v-model="chat.draft" class="flex-1 rounded-lg border px-4 py-2" placeholder="Mensagem..." />
      <button class="px-5 py-2 bg-blue-600 text-white rounded-lg">Enviar</button>
    </form>
  </div>
</template>
```

## Caso 3 — Presença (online/offline)

```ts
// stores/presence.ts
import { defineStore } from 'pinia'
import { ref, onMounted, onUnmounted } from 'vue'
import pb from '@/services/pocketbase'

export const usePresenceStore = defineStore('presence', () => {
  const online = ref(new Set<string>())
  let heartbeat: number | null = null
  let unsub: (() => void) | null = null

  async function start() {
    const me = pb.authStore.model
    if (!me) return

    // marca online
    const rec = await pb.collection('presence').getFirstListItem(`user = "${me.id}"`).catch(() => null)
    if (rec) await pb.collection('presence').update(rec.id, { last_seen: new Date().toISOString() })
    else await pb.collection('presence').create({ user: me.id, last_seen: new Date().toISOString() })

    // ping a cada 30s
    heartbeat = window.setInterval(async () => {
      try { await pb.collection('presence').update(rec?.id ?? '', { last_seen: new Date().toISOString() }) } catch {}
    }, 30_000)

    // subscreve pra ver outros
    unsub = pb.collection('presence').subscribe('*', (e) => {
      if (e.action === 'update' || e.action === 'create') {
        const lastSeen = new Date(e.record.last_seen).getTime()
        const isOn = Date.now() - lastSeen < 60_000
        if (isOn) online.value.add(e.record.user)
        else online.value.delete(e.record.user)
        online.value = new Set(online.value)
      }
    })
  }

  function stop() {
    if (heartbeat) clearInterval(heartbeat)
    unsub?.()
  }

  onUnmounted(stop)
  return { online, start, stop }
})
```

Collection `presence` mínima:
```js
{
  name: 'presence',
  schema: [
    { name: 'user', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
    { name: 'last_seen', type: 'date' },
  ]
}
```

## Caso 4 — Notificações in-app

```js
// collection notifications
{
  name: 'notifications',
  schema: [
    { name: 'user', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
    { name: 'title', type: 'text', required: true },
    { name: 'body',  type: 'text' },
    { name: 'icon',  type: 'text' },
    { name: 'href',  type: 'url' },
    { name: 'read',  type: 'bool' },
  ]
}
```

```ts
// stores/notifications.ts — só do user atual
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<any[]>([])
  const unread = computed(() => items.value.filter(i => !i.read).length)
  let unsub: (() => void) | null = null

  async function start() {
    const me = pb.authStore.model
    if (!me) return
    items.value = (await pb.collection('notifications').getList(1, 50, {
      filter: `user = "${me.id}"`, sort: '-created',
    })).items

    unsub = pb.collection('notifications').subscribe('*', (e) => {
      if (e.record.user !== me.id) return
      if (e.action === 'create') items.value.unshift(e.record)
      else if (e.action === 'update') {
        const i = items.value.findIndex(n => n.id === e.record.id)
        if (i >= 0) items.value[i] = e.record
      }
    })
  }

  async function markRead(id: string) {
    await pb.collection('notifications').update(id, { read: true })
  }

  onUnmounted(() => unsub?.())
  return { items, unread, start, markRead }
})
```

Criando de qualquer lugar (hook PB, outro componente):

```ts
await pb.collection('notifications').create({
  user: targetUserId, title: 'Novo lead!', body: 'Maria te adicionou', href: '/app/leads/123',
})
```

## Performance & cuidados

- **Filtrar pelo cliente**: subscription recebe **todos** os eventos da collection. Filtre no handler:
  ```ts
  if (e.action === 'update' && e.record.owner === auth.user?.id) { /* ... */ }
  ```
- **Throttle de updates**: se 100 cards atualizam ao mesmo tempo, batch com `requestAnimationFrame`:
  ```ts
  let pending: any[] = []
  let scheduled = false
  unsub = pb.collection('cards').subscribe('*', (e) => {
    pending.push(e)
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(() => {
        for (const ev of pending) applyEvent(ev)
        pending = []; scheduled = false
      })
    }
  })
  ```
- **Limite de subscriptions**: PocketBase recomenda <10 simultâneas. Use `pb.realtime.subscribe('collection/*')` se precisar mais.
- **Reconexão**: PB reabre SSE automaticamente. Mas se o token expirar, force refresh:
  ```ts
  pb.collection('users').authRefresh().catch(() => pb.authStore.clear())
  ```
- **Cleanup**: sempre `unsub()` em `onUnmounted` ou quando sair da rota.

## Onde usar

| Caso | Skill de domínio |
|---|---|
| Kanban CRM | `domain-crm-leads` |
| Chat | esta skill (caso 2) |
| Presença | esta skill (caso 3) |
| Notificações | esta skill (caso 4) |
| Dashboard live | subscriptions em `metrics` + agregação |
| Multi-player editor | CRDTs (Yjs) + subscriptions |