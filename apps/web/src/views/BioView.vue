<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
    <!-- Navigation -->
    <nav class="bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center gap-3">
            <RouterLink
              to="/dashboard"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <ArrowLeftIcon class="h-5 w-5 mr-1" />
              Dashboard
            </RouterLink>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Minha Bio
            </h1>
          </div>
          <div class="flex items-center gap-4">
            <div class="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full">
              <div class="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <UserCircleIcon class="h-5 w-5 text-white" />
              </div>
              <span class="text-sm font-semibold text-gray-700">{{ profileStore.name || profileStore.email }}</span>
            </div>
            <button
              @click="handleLogout"
              class="group inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all transform hover:scale-105 shadow-lg"
            >
              <ArrowRightOnRectangleIcon class="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- Hero -->
      <div class="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 overflow-hidden shadow-2xl rounded-2xl">
        <div class="p-8 text-white">
          <div class="flex flex-col sm:flex-row sm:items-center gap-6">
            <div class="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-4 ring-white/30 shrink-0">
              <img
                v-if="profileStore.avatarUrl"
                :src="profileStore.avatarUrl"
                :alt="profileStore.name || 'Avatar'"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-3xl font-bold">{{ profileStore.initials }}</span>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-3xl md:text-4xl font-bold">{{ profileStore.name || 'Sem nome' }}</h2>
                <span
                  v-if="profileStore.isVerified"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold"
                >
                  <ShieldCheckIcon class="h-4 w-4" />
                  E-mail verificado
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm text-xs font-semibold"
                >
                  <ExclamationTriangleIcon class="h-4 w-4" />
                  E-mail não verificado
                </span>
              </div>
              <p class="text-blue-100 text-lg mt-2 break-all">{{ profileStore.email }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Feedback -->
      <div v-if="profileStore.error" class="mt-6 rounded-xl bg-red-50 border-l-4 border-red-500 p-4 shadow-sm" role="alert">
        <div class="flex">
          <ExclamationTriangleIcon class="h-5 w-5 text-red-400 shrink-0" />
          <p class="ml-3 text-sm font-semibold text-red-800">{{ profileStore.error }}</p>
        </div>
      </div>
      <div v-else-if="profileStore.success" class="mt-6 rounded-xl bg-green-50 border-l-4 border-green-500 p-4 shadow-sm" role="alert">
        <div class="flex">
          <CheckCircleIcon class="h-5 w-5 text-green-500 shrink-0" />
          <p class="ml-3 text-sm font-semibold text-green-800">{{ profileStore.success }}</p>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Coluna esquerda: avatar + conta -->
        <div class="space-y-6">
          <!-- Avatar -->
          <section class="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div class="px-6 py-5 border-b border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 flex items-center">
                <CameraIcon class="h-5 w-5 mr-2 text-blue-600" />
                Foto de perfil
              </h3>
              <p class="text-gray-500 text-sm mt-1">JPG, PNG, GIF ou WEBP até 5 MB</p>
            </div>
            <div class="p-6">
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 ring-2 ring-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    v-if="previewUrl || profileStore.avatarUrl"
                    :src="previewUrl || profileStore.avatarUrl"
                    alt="Pré-visualização do avatar"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-2xl font-bold text-gray-400">{{ profileStore.initials }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <label
                    for="avatar"
                    class="inline-flex items-center px-4 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 cursor-pointer hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    <PhotoIcon class="h-5 w-5 mr-2" />
                    Escolher imagem
                  </label>
                  <input id="avatar" type="file" accept="image/*" class="sr-only" @change="handleFileChange" />
                  <p v-if="pendingFile" class="mt-2 text-xs text-gray-500 truncate">{{ pendingFile.name }}</p>
                </div>
              </div>
              <button
                type="button"
                :disabled="!pendingFile || profileStore.saving"
                @click="handleUploadAvatar"
                class="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span v-if="profileStore.saving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <CloudArrowUpIcon v-else class="h-5 w-5" />
                {{ profileStore.saving ? 'Enviando...' : 'Enviar foto' }}
              </button>
            </div>
          </section>

          <!-- Visibilidade do e-mail -->
          <section class="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div class="px-6 py-5 border-b border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 flex items-center">
                <EnvelopeIcon class="h-5 w-5 mr-2 text-purple-600" />
                Privacidade
              </h3>
            </div>
            <div class="p-6">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="emailVisibility"
                  :disabled="profileStore.saving"
                  @change="handleToggleEmailVisibility"
                  class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>
                  <span class="block text-sm font-semibold text-gray-900">Mostrar meu e-mail publicamente</span>
                  <span class="block text-xs text-gray-500 mt-1">
                    Desligado, seu e-mail fica visível apenas para você.
                  </span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <!-- Coluna direita: dados + forms -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Dados da conta -->
          <section class="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-gray-900 flex items-center">
                  <IdentificationIcon class="h-5 w-5 mr-2 text-blue-600" />
                  Dados da conta
                </h3>
                <p class="text-gray-500 text-sm mt-1">Informações registradas no PocketBase</p>
              </div>
              <button
                type="button"
                @click="handleRefresh"
                :disabled="profileStore.loading"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon class="h-4 w-4 mr-1" :class="{ 'animate-spin': profileStore.loading }" />
                Atualizar
              </button>
            </div>
            <div class="p-6">
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div v-for="row in accountRows" :key="row.label" class="min-w-0">
                  <dt class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ row.label }}</dt>
                  <dd class="mt-1 text-sm font-semibold text-gray-900 break-all flex items-center gap-2">
                    <component :is="row.icon" class="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{{ row.value }}</span>
                    <button
                      v-if="row.copyable"
                      type="button"
                      @click="handleCopy(row.value)"
                      class="text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                      title="Copiar"
                    >
                      <ClipboardDocumentIcon class="h-4 w-4" />
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <!-- Editar nome -->
          <section class="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div class="px-6 py-5 border-b border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 flex items-center">
                <PencilSquareIcon class="h-5 w-5 mr-2 text-blue-600" />
                Editar perfil
              </h3>
              <p class="text-gray-500 text-sm mt-1">Atualize como você aparece no sistema</p>
            </div>
            <form class="p-6 space-y-5" @submit.prevent="handleSaveName">
              <div>
                <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
                <input
                  id="name"
                  v-model="nameDraft"
                  type="text"
                  maxlength="255"
                  autocomplete="name"
                  class="appearance-none block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm hover:border-gray-400"
                  placeholder="Como quer ser chamado?"
                />
              </div>
              <div class="flex items-center gap-3">
                <button
                  type="submit"
                  :disabled="profileStore.saving || nameDraft.trim() === profileStore.name"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span v-if="profileStore.saving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <CheckIcon v-else class="h-5 w-5" />
                  {{ profileStore.saving ? 'Salvando...' : 'Salvar nome' }}
                </button>
                <button
                  type="button"
                  @click="nameDraft = profileStore.name"
                  class="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Descartar
                </button>
              </div>
            </form>
          </section>

          <!-- Senha -->
          <section class="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div class="px-6 py-5 border-b border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 flex items-center">
                <KeyIcon class="h-5 w-5 mr-2 text-purple-600" />
                Alterar senha
              </h3>
              <p class="text-gray-500 text-sm mt-1">Mínimo de 8 caracteres</p>
            </div>
            <form class="p-6 space-y-5" @submit.prevent="handleChangePassword">
              <div>
                <label for="oldPassword" class="block text-sm font-semibold text-gray-700 mb-2">Senha atual</label>
                <input
                  id="oldPassword"
                  v-model="passwordForm.oldPassword"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="appearance-none block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label for="newPassword" class="block text-sm font-semibold text-gray-700 mb-2">Nova senha</label>
                  <input
                    id="newPassword"
                    v-model="passwordForm.password"
                    type="password"
                    autocomplete="new-password"
                    minlength="8"
                    required
                    class="appearance-none block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label for="passwordConfirm" class="block text-sm font-semibold text-gray-700 mb-2">Confirmar nova senha</label>
                  <input
                    id="passwordConfirm"
                    v-model="passwordForm.passwordConfirm"
                    type="password"
                    autocomplete="new-password"
                    minlength="8"
                    required
                    class="appearance-none block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
              <button
                type="submit"
                :disabled="profileStore.saving"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span v-if="profileStore.saving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <KeyIcon v-else class="h-5 w-5" />
                {{ profileStore.saving ? 'Alterando...' : 'Alterar senha' }}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CloudArrowUpIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  KeyIcon,
  PencilSquareIcon,
  PhotoIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline'
import type { Component } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB

const nameDraft = ref(profileStore.name)
const pendingFile = ref<File | null>(null)
const previewUrl = ref('')
const passwordForm = ref({ oldPassword: '', password: '', passwordConfirm: '' })
const formError = ref('')

const emailVisibility = computed(() => !!profileStore.profile?.emailVisibility)

const accountRows = computed<{ label: string; value: string; icon: Component; copyable?: boolean }[]>(() => [
  { label: 'Nome', value: profileStore.name || '—', icon: UserCircleIcon },
  { label: 'E-mail', value: profileStore.email || '—', icon: EnvelopeIcon },
  { label: 'ID do usuário', value: profileStore.profileId || '—', icon: IdentificationIcon, copyable: true },
  {
    label: 'E-mail verificado',
    value: profileStore.isVerified ? 'Sim' : 'Não',
    icon: ShieldCheckIcon,
  },
  {
    label: 'Visibilidade do e-mail',
    value: emailVisibility.value ? 'Público' : 'Privado',
    icon: EnvelopeIcon,
  },
  { label: 'Criado em', value: formatDate(profileStore.profile?.created), icon: ClockIcon },
  { label: 'Atualizado em', value: formatDate(profileStore.profile?.updated), icon: ClockIcon },
])

function formatDate(value?: string): string {
  if (!value) return '—'
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed)
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

async function handleRefresh() {
  await profileStore.load()
  nameDraft.value = profileStore.name
}

async function handleSaveName() {
  await profileStore.updateName(nameDraft.value.trim())
  nameDraft.value = profileStore.name
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  formError.value = ''

  if (!file) {
    pendingFile.value = null
    return
  }

  if (!file.type.startsWith('image/')) {
    pendingFile.value = null
    input.value = ''
    profileStore.clearFeedback()
    formError.value = 'Selecione um arquivo de imagem.'
    return
  }

  if (file.size > MAX_AVATAR_SIZE) {
    pendingFile.value = null
    input.value = ''
    profileStore.clearFeedback()
    formError.value = 'A imagem deve ter no máximo 5 MB.'
    return
  }

  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  pendingFile.value = file
  input.value = ''
}

async function handleUploadAvatar() {
  if (!pendingFile.value) return
  await profileStore.updateAvatar(pendingFile.value)
  pendingFile.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

async function handleToggleEmailVisibility(event: Event) {
  const input = event.target as HTMLInputElement
  const desired = input.checked
  await profileStore.updateEmailVisibility(desired)

  // se a atualização falhou, devolve o checkbox ao estado persistido
  if (profileStore.error) input.checked = emailVisibility.value
}

async function handleChangePassword() {
  formError.value = ''

  if (passwordForm.value.password !== passwordForm.value.passwordConfirm) {
    formError.value = 'A confirmação não bate com a nova senha.'
    return
  }

  if (passwordForm.value.password.length < 8) {
    formError.value = 'A nova senha precisa ter pelo menos 8 caracteres.'
    return
  }

  await profileStore.changePassword(
    passwordForm.value.oldPassword,
    passwordForm.value.password,
    passwordForm.value.passwordConfirm,
  )

  passwordForm.value = { oldPassword: '', password: '', passwordConfirm: '' }
}

async function handleCopy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // clipboard bloqueado (http inseguro / permissão negada) — ignora
  }
}

onMounted(async () => {
  await profileStore.load()
  nameDraft.value = profileStore.name
})

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>
