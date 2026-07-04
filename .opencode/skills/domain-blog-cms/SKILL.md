---
name: domain-blog-cms
description: Como adicionar um Blog/CMS completo (posts, categorias, tags, autores, comentários) no template. Cobre schema com relations, slug auto-gerado via hook, editor rich text, SEO meta e view pública. Use quando o usuário quiser um blog, portal de conteúdo, área de artigos ou documentação versionada.
---

# Domínio — Blog / CMS

Caso real: app com área de conteúdo (blog, knowledge base, changelog, docs).

## 🏛️ Alinhamento com Arquitetura Recomendada

Esta skill segue os 5 padrões da [Arquitetura Recomendada](../../README.md#-arquitetura-recomendada):

| Padrão | Aplicação nesta skill |
|---|---|
| 1 — Camada de Service | Store de `posts` consome service, nunca `pb` direto |
| 2 — Service thin + hook | CRUD direto no service; contador de views e slug auto-gerado via hooks |
| 3 — Backend é a verdade | `posts` filtra por `status = "published" \|\| author = @request.auth.id` |
| 4 — Vertical slicing | Estrutura `features/blog/{posts,categories,tags,comments}/` |
| 5 — Type-safety | Tipos via `@pb-types` (`PostsRecord`, `CategoriesRecord`, `CommentsRecord`) |

### Service layer desta skill

```ts
// apps/web/src/features/blog/posts/services/posts.service.ts
import pb from '@/shared/services/pocketbase'
import type { PostsRecord } from '@pb-types'

export const postsService = {
  // CRUD — Padrão 1 + 2
  async listPublished(page = 1, perPage = 12) {
    return pb.collection('posts').getList<PostsRecord>(page, perPage, {
      filter: 'status = "published"',
      sort: '-published_at',
      expand: 'author,category,tags',
    })
  },
  async getBySlug(slug: string) {
    return pb.collection('posts').getFirstListItem<PostsRecord>(
      `slug = "${slug}" && status = "published"`,
      { expand: 'author,category,tags' }
    )
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
  async incrementView(postId: string) {
    return pb.send(`/api/posts/${postId}/view`, { method: 'POST' })
  },
}
```

> 📖 Detalhes do padrão service layer na skill [`vue-pinia-store`](../vue-pinia-store/SKILL.md).

## Visão do domínio

```
posts           categories      tags           comments
─────           ──────────      ───            ────────
id              id              id             id
title           name            name           post_id
slug            slug            slug           author_name
excerpt         description     color          author_email
content (editor)                            body
cover_image                   posts_tags:    approved (bool)
status (draft/published)        post_id      parent_id (respostas)
published_at                    tag_id       created
author (relation→users)
category (relation→categories)
tags (relation→tags, maxSelect N)
reading_time (number, auto)
views (number, counter)
seo_title
seo_description
```

## 1. Schema — migrations

```js
// pocketbase/pb_migrations/1700000000_create_blog.js
/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  // categories
  Dao(db).saveCollection(new Collection({
    name: 'categories',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true, max: 80 },
      { name: 'slug', type: 'text', required: true, max: 100,
        pattern: "^[a-z0-9-]+$" },
      { name: 'description', type: 'text' },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_cat_slug ON categories (slug)'],
  }))

  // tags
  Dao(db).saveCollection(new Collection({
    name: 'tags',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true, max: 40 },
      { name: 'slug', type: 'text', required: true, max: 60, pattern: "^[a-z0-9-]+$" },
      { name: 'color', type: 'text', max: 7, pattern: "^#[0-9A-Fa-f]{6}$" },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_tag_slug ON tags (slug)'],
  }))

  // posts
  Dao(db).saveCollection(new Collection({
    name: 'posts',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true, max: 200 },
      { name: 'slug',  type: 'text', required: true, max: 220, pattern: "^[a-z0-9-]+$" },
      { name: 'excerpt', type: 'text', max: 300 },
      { name: 'content', type: 'editor' },
      { name: 'cover_image', type: 'file', maxSelect: 1, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
      { name: 'status', type: 'select', required: true,
        options: { maxSelect: 1, values: ['draft', 'published', 'archived'] } },
      { name: 'published_at', type: 'date' },
      { name: 'author',   type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false },
      { name: 'category', type: 'relation', collectionId: 'categories',    maxSelect: 1 },
      { name: 'tags',     type: 'relation', collectionId: 'tags',           maxSelect: 10 },
      { name: 'reading_time', type: 'number', min: 1 },
      { name: 'views', type: 'number' },
      { name: 'seo_title',       type: 'text', max: 60 },
      { name: 'seo_description', type: 'text', max: 160 },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_post_slug ON posts (slug)',
      'CREATE INDEX idx_post_status ON posts (status, published_at)',
    ],
  }))

  // comments
  Dao(db).saveCollection(new Collection({
    name: 'comments',
    type: 'base',
    schema: [
      { name: 'post',         type: 'relation', collectionId: 'posts', required: true, maxSelect: 1, cascadeDelete: true },
      { name: 'author_name',  type: 'text', required: true, max: 80 },
      { name: 'author_email', type: 'email', required: true },
      { name: 'body',         type: 'text', required: true, max: 2000 },
      { name: 'approved',     type: 'bool' },
      { name: 'parent',       type: 'relation', collectionId: 'comments', maxSelect: 1, cascadeDelete: true },
    ],
    indexes: ['CREATE INDEX idx_comment_post ON comments (post, approved)'],
  }))
})
```

### Regras de acesso

| Collection    | ListRule                        | ViewRule                       | CreateRule         | UpdateRule                | DeleteRule                |
|---------------|---------------------------------|--------------------------------|--------------------|---------------------------|---------------------------|
| `categories`  | `""` (público)                  | `""`                           | admin              | admin                     | admin                     |
| `tags`        | `""`                            | `""`                           | admin              | admin                     | admin                     |
| `posts`       | `status = "published" \|\| author = @request.auth.id` | mesmo | `author = @request.auth.id` | `author = @request.auth.id` | `author = @request.auth.id \|\| @request.auth.isAdmin` |
| `comments`    | `approved = true \|\| @request.auth.isAdmin` | mesmo | `""` (qualquer um) | admin                    | admin                     |

> Em prod: moderar comentários automaticamente com hook de spam (palavras-chave, rate limit por IP).

## 2. Hooks

### `pocketbase/pb_hooks/posts.pb.js` — slug + reading_time + published_at

```js
/// <reference path="../pb_data/types.d.ts" />

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 200)
}

onRecordBeforeCreateRequest((e) => {
  if (e.collection.name !== 'posts') return

  // gera slug se vazio
  if (!e.record.getString('slug') && e.record.getString('title')) {
    e.record.set('slug', slugify(e.record.getString('title')))
  }

  // autor = user atual se vazio
  if (!e.record.getString('author') && e.auth?.id) {
    e.record.set('author', e.auth.id)
  }

  // published_at quando muda pra published
  if (e.record.getString('status') === 'published' && !e.record.getString('published_at')) {
    e.record.set('published_at', new Date().toISOString())
  }

  // reading_time ~ 200 palavras/min
  const content = e.record.getString('content') || ''
  const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length
  e.record.set('reading_time', Math.max(1, Math.ceil(words / 200)))
  e.record.set('views', 0)
}, $app)

onRecordBeforeUpdateRequest((e) => {
  if (e.collection.name !== 'posts') return
  if (e.record.getString('status') === 'published' && !e.record.getString('published_at')) {
    e.record.set('published_at', new Date().toISOString())
  }
}, $app)

// contador de views — atômico no servidor
routerAdd('POST', '/api/posts/:id/view', async (c) => {
  const dao = c.app.dao()
  const id  = c.request.pathValue('id')
  const rec = dao.findRecordById('posts', id)
  rec.set('views', (rec.getNumber('views') || 0) + 1)
  dao.saveRecord(rec)
  return c.json(200, { views: rec.getNumber('views') })
})
```

### `pocketbase/pb_hooks/categories.pb.js` — slugify + unicidade

```js
/// <reference path="../pb_data/types.d.ts" />

onRecordBeforeCreateRequest((e) => {
  if (e.collection.name !== 'categories' && e.collection.name !== 'tags') return
  if (!e.record.getString('slug') && e.record.getString('name')) {
    const base = e.record.getString('name').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
    // garantia simples de unicidade — concatena timestamp se colidir
    let slug = base, i = 1
    try {
      while ($app.dao().findFirstRecordByData(e.collection.name, 'slug', slug)) {
        slug = `${base}-${i++}`
      }
    } catch { /* not found is OK */ }
    e.record.set('slug', slug)
  }
}, $app)
```

### `pocketbase/pb_hooks/comments.pb.js` — auto-aprovar pra known users

```js
/// <reference path="../pb_data/types.d.ts" />

onRecordBeforeCreateRequest((e) => {
  if (e.collection.name !== 'comments') return
  // approved = false pra moderar. Se quiser auto-aprovar pra logados:
  // if (e.auth?.id) e.record.set('approved', true)
}, $app)
```

## 3. Stores Pinia (via service layer — Padrão 1)

### Service (camada que fala com pb)

```ts
// apps/web/src/features/blog/posts/services/posts.service.ts
import pb from '@/shared/services/pocketbase'
import type { PostsRecord } from '@pb-types'

export interface PostFilters {
  page?: number
  perPage?: number
  tag?: string
  category?: string
}

export const postsService = {
  // CRUD — Padrão 1 + 2 (thin wrapper)
  async listPublished(filters: PostFilters = {}) {
    const filter: string[] = ['status = "published"']
    if (filters.tag)      filter.push(`tags ?~ "${filters.tag}"`)
    if (filters.category) filter.push(`category = "${filters.category}"`)

    return pb.collection('posts').getList<PostsRecord>(
      filters.page ?? 1,
      filters.perPage ?? 12,
      {
        filter: filter.join(' && '),
        sort: '-published_at',
        expand: 'author,category,tags',
      },
    )
  },

  async getBySlug(slug: string) {
    return pb.collection('posts').getFirstListItem<PostsRecord>(
      `slug = "${slug}" && status = "published"`,
      { expand: 'author,category,tags' },
    )
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

  // Lógica avançada — Padrão 2 (endpoint custom)
  async incrementView(postId: string) {
    return pb.send(`/api/posts/${postId}/view`, { method: 'POST' })
  },
}
```

### Store (consome o service, NUNCA pb direto)

```ts
// apps/web/src/features/blog/posts/stores/posts.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postsService, type PostFilters } from '../services/posts.service'
import type { PostsRecord } from '@pb-types'

export const usePostsStore = defineStore('posts', () => {
  const items = ref<PostsRecord[]>([])
  const current = ref<PostsRecord | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPublished(filters: PostFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await postsService.listPublished(filters)
      items.value = res.items
      return res
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Falha ao buscar posts'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchBySlug(slug: string) {
    loading.value = true
    try {
      const rec = await postsService.getBySlug(slug)
      current.value = rec
      // incrementa view (rota custom do hook) — fire-and-forget
      postsService.incrementView(rec.id).catch(() => {})
      return rec
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Post não encontrado'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<PostsRecord>) {
    const created = await postsService.create(data)
    items.value.unshift(created)
    return created
  }

  async function update(id: string, data: Partial<PostsRecord>) {
    const updated = await postsService.update(id, data)
    const i = items.value.findIndex(p => p.id === id)
    if (i >= 0) items.value[i] = updated
    if (current.value?.id === id) current.value = updated
    return updated
  }

  async function remove(id: string) {
    await postsService.delete(id)
    items.value = items.value.filter(p => p.id !== id)
    if (current.value?.id === id) current.value = null
  }

  return { items, current, loading, error, fetchPublished, fetchBySlug, create, update, remove }
})
```

> 📖 Esse padrão (service + store) é a **implementação canônica** do Padrão 1. Veja [`domain-feature-scaffold`](../domain-feature-scaffold/SKILL.md) pra receita completa.

## 4. Router

```ts
// /blog (lista)  /blog/:slug (post)  /admin/posts (gerenciar)
{
  path: '/blog',
  name: 'blog',
  component: () => import('../views/blog/BlogListView.vue'),
},
{
  path: '/blog/:slug',
  name: 'blog-post',
  component: () => import('../views/blog/BlogPostView.vue'),
  props: true,
},
{
  path: '/admin/posts',
  name: 'admin-posts',
  component: () => import('../views/admin/AdminPostsView.vue'),
  meta: { requiresAuth: true, requiredRole: 'editor' },
},
```

## 5. Views

### Lista — `apps/web/src/views/blog/BlogListView.vue`

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { usePostsStore } from '@/stores/posts'

const posts = usePostsStore()
onMounted(() => posts.fetchPublished())
</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <h1 class="text-4xl font-bold mb-8">Blog</h1>

    <div v-if="posts.loading" class="text-center py-12">Carregando...</div>

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <article v-for="p in posts.items" :key="p.id"
        class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
        <img v-if="p.cover_image" :src="pb.files.getURL(p, p.cover_image)" class="w-full h-48 object-cover" />
        <div class="p-5">
          <p class="text-xs text-blue-600 uppercase font-semibold">
            {{ p.expand?.category?.name }}
          </p>
          <h2 class="text-xl font-bold mt-2 mb-2">
            <router-link :to="`/blog/${p.slug}`">{{ p.title }}</router-link>
          </h2>
          <p class="text-gray-600 text-sm line-clamp-3">{{ p.excerpt }}</p>
          <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>{{ p.expand?.author?.name }}</span>
            <span>{{ p.reading_time }} min · {{ p.views }} views</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
```

### Post — `apps/web/src/views/blog/BlogPostView.vue`

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePostsStore } from '@/stores/posts'

const route = useRoute()
const posts = usePostsStore()

onMounted(() => posts.fetchBySlug(route.params.slug as string))
watch(() => route.params.slug, (s) => s && posts.fetchBySlug(s as string))
</script>

<template>
  <article v-if="posts.current" class="max-w-3xl mx-auto p-6">
    <h1 class="text-5xl font-extrabold mb-3">{{ posts.current.title }}</h1>
    <p class="text-gray-500 mb-6">
      Por {{ posts.current.expand?.author?.name }} ·
      {{ new Date(posts.current.published_at).toLocaleDateString('pt-BR') }} ·
      {{ posts.current.reading_time }} min
    </p>
    <img v-if="posts.current.cover_image"
      :src="pb.files.getURL(posts.current, posts.current.cover_image)"
      class="w-full rounded-2xl mb-8" />
    <div class="prose prose-lg max-w-none" v-html="posts.current.content"></div>

    <!-- tags -->
    <div class="mt-8 flex gap-2">
      <span v-for="t in posts.current.expand?.tags" :key="t.id"
        class="px-3 py-1 rounded-full text-xs font-medium"
        :style="{ background: t.color + '20', color: t.color }">
        {{ t.name }}
      </span>
    </div>
  </article>
</template>
```

## 6. Editor (admin)

`apps/web/src/views/admin/AdminPostsView.vue` — usa um editor WYSIWYG simples:

```bash
npm i @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-link
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { usePostsStore } from '@/stores/posts'

const content = ref('<p>Comece a escrever...</p>')
const editor = useEditor({
  content,
  extensions: [StarterKit, Link.configure({ openOnClick: false })],
})

async function save() {
  const posts = usePostsStore()
  await posts.create({
    title: 'Novo post',
    content: editor.value?.getHTML(),
    status: 'draft',
  })
}
</script>

<template>
  <div class="p-6 max-w-4xl">
    <EditorContent :editor="editor" class="prose max-w-none min-h-[500px] border rounded-xl p-4" />
    <button @click="save" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
      Salvar rascunho
    </button>
  </div>
</template>
```

## Próximos passos

- **SEO**: render `<title>`, `<meta>` no post (server side via hook que devolve HTML, ou `@unhead/vue` no client)
- **RSS/Atom**: rota custom no PB hook que devolve XML com últimos posts
- **Newsletter**: collection `subscribers` + hook envia email ao publicar
- **Busca full-text**: filtro `content ~ "termo"` (limitado) ou coleção `search_index` própria
- **Versionamento**: campo `versions` JSON + diff pra mostrar histórico
- **Multi-idioma**: collection `post_translations` com `locale` e `post_id`