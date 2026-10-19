---
name: tailwind-vue-component
description: Criar componentes Vue 3 (script setup + lang=ts) estilizados com Tailwind CSS v4 no padrão do template — import único @import "tailwindcss", tokens via @theme no CSS (sem config JS), gradientes azul→roxo, cantos arredondados grandes, Heroicons e os patterns prontos (card, form, spinner, toast, botão com loading). Use quando o usuário quiser adicionar uma página, card, formulário, botão, modal ou qualquer UI pro web app ou landing.
---

# Tailwind v4 + Vue 3 — padrão de componente

O template usa **Tailwind CSS v4** com a sintaxe `@import` e o plugin `@tailwindcss/postcss`.

## Setup (já feito no template)

```css
/* apps/web/src/style.css */
@import "tailwindcss";
```

```js
// apps/web/postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

> ⚠️ Os arquivos `apps/*/tailwind.config.js` que existem no repo são **legados**: o Tailwind v4 **não** lê `tailwind.config.js` automaticamente. Configuração do v4 é feita **no CSS**, via `@theme`. (Se precisar migrar um config antigo, use `@config "./tailwind.config.js";` no `style.css` — mas o padrão do template é CSS puro.)

**Componentes são place-free**: `class="..."` direto no template. Sem `@apply`, sem CSS modules, sem `<style scoped>`.

## Estrutura canônica

```vue
<!-- apps/web/src/components/<Nome>.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRightIcon } from '@heroicons/vue/24/outline'

interface Props {
  title: string
  variant?: 'primary' | 'secondary'
}
const props = withDefaults(defineProps<Props>(), { variant: 'primary' })

const emit = defineEmits<{ submit: [value: string] }>()

const draft = ref('')
function onSubmit() {
  emit('submit', draft.value)
  draft.value = ''
}
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
    <h2 class="text-2xl font-bold text-gray-900 mb-3">{{ title }}</h2>
    <div class="flex gap-3">
      <input
        v-model="draft"
        class="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        placeholder="Escreva algo..."
      />
      <button
        type="button"
        @click="onSubmit"
        :class="[
          'rounded-lg px-5 py-2 font-medium transition',
          props.variant === 'primary'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        ]"
      >
        Enviar
      </button>
    </div>
  </section>
</template>
```

## Convenções do projeto

1. **`<script setup lang="ts">`** sempre (não `defineComponent`).
2. **Gradiente azul→roxo** é a paleta padrão (`from-blue-600 to-purple-600`).
3. **Cantos arredondados grandes**: `rounded-xl`, `rounded-2xl`.
4. **Sombras leves**: `shadow-lg`, `shadow-xl` (evitar `shadow-2xl` em listas).
5. **Ícones com Heroicons** (já é dependência do `apps/web`):

```ts
import { ArrowRightIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
// solid: '@heroicons/vue/24/solid'
```

```html
<ArrowRightIcon class="w-5 h-5 text-blue-600" />
```

## Patterns prontos pra copiar

### Card clicável

```html
<a href="#" class="group block p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition border-2 border-transparent hover:border-blue-200">
  <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
    <UserCircleIcon class="w-6 h-6" />
  </div>
  <h3 class="text-xl font-bold mb-2">Título</h3>
  <p class="text-gray-600">Descrição breve do card.</p>
</a>
```

### Form input com erro

```html
<div>
  <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
  <input
    id="email"
    v-model="email"
    type="email"
    :class="[
      'w-full rounded-lg border px-4 py-2 outline-none transition',
      error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-200 focus:border-blue-500'
    ]"
  />
  <p v-if="error" class="text-sm text-red-600 mt-1">{{ error }}</p>
</div>
```

### Loading spinner

```html
<template v-if="loading">
  <div class="flex justify-center p-8">
    <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
</template>
```

### Toast/alert (sem lib)

```vue
<script setup lang="ts">
const props = defineProps<{ kind: 'success' | 'error'; message: string }>()
const palette = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50   border-red-200   text-red-800',
} as const
</script>

<template>
  <div :class="['p-4 rounded-lg border', palette[kind]]" role="alert">
    {{ message }}
  </div>
</template>
```

### Botão com loading

```html
<button :disabled="loading" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
  <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
  <span>{{ loading ? 'Enviando...' : 'Salvar' }}</span>
</button>
```

## Tailwind v4 — diferenças da v3

- **Config no CSS**, não em `tailwind.config.js`:
  ```css
  @import "tailwindcss";

  @theme {
    --color-brand: #4f46e5;
    --font-display: 'Inter', system-ui;
  }
  ```
  Tokens custom viram `bg-brand`, `font-display`, etc.
- **`dark:` não vem por default** — use `@variant dark (...)` no CSS se precisar.
- **Variantes arbitrárias** funcionam direto na classe: `data-[state=open]:bg-blue-500`, `w-[calc(100%-2rem)]`.
- **`@apply` continua funcionando**, mas use com parcimônia — o padrão do template é classe direto no template.

## Onde colocar

```
apps/web/src/
├── components/        # reutilizáveis (Botão, Card, Modal, FormField...)
├── views/             # páginas roteadas (LoginView, DashboardView, PostsView...)
├── router/index.ts    # registra as views nas rotas
└── stores/            # estado compartilhado
```

## Checklist pra componente novo

- [ ] `<script setup lang="ts">` no topo
- [ ] Props/emits tipadas (`defineProps<Props>()`, `defineEmits<{...}>()`)
- [ ] Sem CSS module, sem `<style scoped>` — só classes Tailwind
- [ ] Estados de hover/focus/disabled
- [ ] Responsivo (`sm:`, `md:`, `lg:`)
- [ ] Sem emoji cru como ícone — use `@heroicons/vue`
- [ ] Acessibilidade: `<label for>`, `aria-*`, `role="..."` quando apropriado
- [ ] `npm run build:web` verde (`vue-tsc` é estrito: `noUnusedLocals` pega sobra)
