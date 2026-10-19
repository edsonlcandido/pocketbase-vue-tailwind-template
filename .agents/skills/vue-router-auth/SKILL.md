---
name: vue-router-auth
description: Adicionar e proteger rotas Vue Router no padrão do template — meta: { requiresAuth | requiresGuest }, base path /app/, guard que valida o token com pb.collection('users').authRefresh() e redirecionamento por role. Use quando o usuário quiser criar nova página, painel protegido, fluxo de onboarding, rota pública ou redirecionamento por papel.
---

# Vue Router — rotas com auth

Configuração em `apps/web/src/router/index.ts`. O web app é montado em **`/app/`** (por causa do `base: '/app/'` do Vite + o hook `main.pb.js` do PocketBase).

## Rotas existentes

| Path | Nome | Meta |
|---|---|---|
| `/` | (redirect) | → `/dashboard` |
| `/login` | `login` | `requiresGuest: true` |
| `/dashboard` | `dashboard` | `requiresAuth: true` |

## Adicionar rota protegida

```ts
// apps/web/src/router/index.ts
import PostsView from '../views/PostsView.vue'

const router = createRouter({
  history: createWebHistory('/app/'),
  routes: [
    // ... existentes
    {
      path: '/posts',
      name: 'posts',
      component: PostsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/posts/:id',
      name: 'post-detail',
      component: PostDetailView,
      meta: { requiresAuth: true },
      props: true,          // injeta :id como prop
    },
  ],
})
```

## Rota de visitante (login/registro/onboarding)

```ts
{
  path: '/onboarding',
  name: 'onboarding',
  component: OnboardingView,
  meta: { requiresGuest: true },
}
```

## Rota pública (sem checagem)

```ts
{
  path: '/about',
  name: 'about',
  component: AboutView,
  // sem meta -> passa direto
}
```

## Guard já configurado

```ts
router.beforeEach(async (to, _from, next) => {
  let isAuthenticated = pb.authStore.isValid && !!pb.authStore.model

  if (to.meta.requiresAuth && isAuthenticated) {
    try {
      await pb.collection('users').authRefresh()
    } catch {
      pb.authStore.clear()
      isAuthenticated = false
    }
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})
```

> **Não duplique esse guard.** Para lógica nova (ex.: checar role), crie um **segundo** `beforeEach` ou estenda o `meta`.

## Estendendo o guard pra checar papel/role

```ts
// apps/web/src/router/index.ts
router.beforeEach(async (to) => {
  const required = to.meta.requiredRole as string | undefined
  if (!required) return true

  const user = pb.authStore.model
  if (!user) return { path: '/login' }
  if ((user as any).role !== required) return { path: '/dashboard' }
})
```

```ts
// na rota:
{ path: '/admin', name: 'admin', component: AdminView,
  meta: { requiresAuth: true, requiredRole: 'admin' } }
```

> O campo `role` precisa existir na collection `users` (ou numa collection `profiles` ligada por relation). Ver `.agents/skills/pocketbase-collections/SKILL.md`.

## Navegação programática

```ts
import { useRouter } from 'vue-router'
const router = useRouter()
router.push('/dashboard')
router.push({ name: 'post-detail', params: { id: '123' } })
router.replace('/login')   // não empilha histórico
```

## Lazy loading (apps com mais de ~5 telas)

```ts
{
  path: '/posts',
  name: 'posts',
  component: () => import('../views/PostsView.vue'),
  meta: { requiresAuth: true },
}
```

O Vite cria um chunk por rota automaticamente.

## Layouts aninhados (opcional)

```ts
{
  path: '/',
  component: () => import('../layouts/AuthLayout.vue'),
  meta: { requiresAuth: true },
  children: [
    { path: 'dashboard', name: 'dashboard', component: DashboardView },
    { path: 'posts', name: 'posts', component: () => import('../views/PostsView.vue') },
  ],
}
```

> ⚠️ Com nested routes, o `redirect: '/dashboard'` continua funcionando (vai pro primeiro child).

## 404

```ts
{ path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
```

## Checklist

- [ ] Path **sem** `/app/` — o base path cuida disso
- [ ] `meta.requiresAuth` em qualquer rota que toque dados do user
- [ ] `meta.requiresGuest` em login/registro/onboarding
- [ ] View em `apps/web/src/views/`
- [ ] Lazy loading quando a view for grande
- [ ] Testar logout: o guard deve redirecionar pra `/login` ao tentar entrar em rota protegida
- [ ] `npm run build:web` verde (`vue-tsc` é estrito)
