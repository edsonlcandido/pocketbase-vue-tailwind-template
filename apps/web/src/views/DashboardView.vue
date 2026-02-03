<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <UserCircleIcon class="h-6 w-6 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">{{ userName }}</span>
            </div>
            <button
              @click="handleLogout"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowRightOnRectangleIcon class="h-5 w-5 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Welcome Section -->
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white overflow-hidden shadow-xl rounded-lg">
          <div class="p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">
              Bem-vindo, {{ userName }}!
            </h2>
            <p class="text-gray-600">
              Você está logado no sistema.
            </p>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="px-4 py-6 sm:px-0">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Stat Card 1 -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <ChartBarIcon class="h-6 w-6 text-blue-600" />
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Total de Usuários
                    </dt>
                    <dd class="text-lg font-semibold text-gray-900">
                      1
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Stat Card 2 -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <DocumentTextIcon class="h-6 w-6 text-green-600" />
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Documentos
                    </dt>
                    <dd class="text-lg font-semibold text-gray-900">
                      0
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Stat Card 3 -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <CheckCircleIcon class="h-6 w-6 text-purple-600" />
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Status
                    </dt>
                    <dd class="text-lg font-semibold text-gray-900">
                      Ativo
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
              Ações Rápidas
            </h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div class="flex-shrink-0">
                  <PlusCircleIcon class="h-6 w-6 text-blue-600" />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <span class="text-sm font-medium text-gray-900">Novo Item</span>
                </div>
              </button>

              <button class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div class="flex-shrink-0">
                  <CogIcon class="h-6 w-6 text-gray-600" />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <span class="text-sm font-medium text-gray-900">Configurações</span>
                </div>
              </button>

              <a
                href="/"
                class="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div class="flex-shrink-0">
                  <HomeIcon class="h-6 w-6 text-green-600" />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <span class="text-sm font-medium text-gray-900">Ir para Home</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Section -->
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div class="flex">
            <div class="flex-shrink-0">
              <InformationCircleIcon class="h-5 w-5 text-blue-400" />
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-700">
                Este é um template de dashboard usando <strong>PocketBase + Vue 3 + TypeScript + Tailwind CSS</strong>.
                Você pode personalizar este dashboard de acordo com suas necessidades.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  CogIcon,
  HomeIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => {
  return authStore.user?.name || authStore.user?.email || 'Usuário'
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>
