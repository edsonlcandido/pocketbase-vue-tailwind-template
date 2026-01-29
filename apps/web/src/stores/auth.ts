import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '../services/pocketbase'
import type { RecordModel } from 'pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<RecordModel | null>(pb.authStore.model)
  const token = ref<string>(pb.authStore.token)

  const isLoggedIn = computed(() => pb.authStore.isValid && !!user.value)

  // Sincronizar com o authStore do PocketBase
  pb.authStore.onChange((newToken, newModel) => {
    token.value = newToken
    user.value = newModel
  })

  async function login(email: string, password: string) {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      user.value = authData.record
      token.value = pb.authStore.token
      return { success: true }
    } catch (error: any) {
      return { 
        success: false, 
        error: error?.message || 'Falha ao fazer login'
      }
    }
  }

  function logout() {
    pb.authStore.clear()
    user.value = null
    token.value = ''
  }

  async function register(email: string, password: string, passwordConfirm: string, name?: string) {
    try {
      const data = {
        email,
        password,
        passwordConfirm,
        name: name || email.split('@')[0],
      }
      
      await pb.collection('users').create(data)
      
      // Após criar, fazer login automaticamente
      return await login(email, password)
    } catch (error: any) {
      return { 
        success: false, 
        error: error?.message || 'Falha ao registrar'
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    logout,
    register,
  }
})
