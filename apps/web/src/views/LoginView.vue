<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ isRegistering ? 'Criar conta' : 'Entrar na sua conta' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          <a href="/" class="font-medium text-blue-600 hover:text-blue-500">
            ← Voltar para a landing page
          </a>
        </p>
      </div>
      
      <div class="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div v-if="error" class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  {{ error }}
                </h3>
              </div>
            </div>
          </div>

          <div v-if="isRegistering">
            <label for="name" class="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <div class="mt-1">
              <input
                id="name"
                v-model="formData.name"
                type="text"
                autocomplete="name"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="formData.email"
                type="email"
                autocomplete="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="formData.password"
                type="password"
                autocomplete="current-password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div v-if="isRegistering">
            <label for="passwordConfirm" class="block text-sm font-medium text-gray-700">
              Confirmar senha
            </label>
            <div class="mt-1">
              <input
                id="passwordConfirm"
                v-model="formData.passwordConfirm"
                type="password"
                autocomplete="new-password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading">Carregando...</span>
              <span v-else>{{ isRegistering ? 'Criar conta' : 'Entrar' }}</span>
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">
                {{ isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?' }}
              </span>
            </div>
          </div>

          <div class="mt-6">
            <button
              type="button"
              @click="toggleMode"
              class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {{ isRegistering ? 'Entrar' : 'Criar conta' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isRegistering = ref(false)
const loading = ref(false)
const error = ref('')

const formData = ref({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
})

function toggleMode() {
  isRegistering.value = !isRegistering.value
  error.value = ''
  formData.value = {
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  }
}

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    let result

    if (isRegistering.value) {
      result = await authStore.register(
        formData.value.email,
        formData.value.password,
        formData.value.passwordConfirm,
        formData.value.name
      )
    } else {
      result = await authStore.login(
        formData.value.email,
        formData.value.password
      )
    }

    if (result.success) {
      router.push('/dashboard')
    } else {
      error.value = result.error || 'Ocorreu um erro'
    }
  } catch (e: any) {
    error.value = e?.message || 'Ocorreu um erro'
  } finally {
    loading.value = false
  }
}
</script>
