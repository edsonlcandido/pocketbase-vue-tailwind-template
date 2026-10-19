import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import pb from '../services/pocketbase'
import { fetchProfile, saveProfile } from '../services/profile'
import type { RecordModel } from 'pocketbase'

export const useProfileStore = defineStore('profile', () => {
  // ---- state
  const profile = ref<RecordModel | null>(pb.authStore.model)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)

  // O SDK sincroniza o authStore depois de um update no próprio registro,
  // então o onChange mantém este espelho sempre em dia.
  pb.authStore.onChange((_token, model) => {
    profile.value = model
  })

  // ---- getters
  const profileId = computed(() => profile.value?.id ?? '')
  const name = computed(() => profile.value?.name ?? '')
  const email = computed(() => profile.value?.email ?? '')
  const isVerified = computed(() => !!profile.value?.verified)
  const hasAvatar = computed(() => !!profile.value?.avatar)
  const avatarUrl = computed(() =>
    profile.value && profile.value.avatar ? pb.files.getURL(profile.value, 'avatar') : '',
  )
  const initials = computed(() => {
    const source: string = name.value || email.value || '?'
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  })

  function clearFeedback() {
    error.value = null
    success.value = null
  }

  // ---- actions
  async function load() {
    if (!profileId.value) return
    loading.value = true
    clearFeedback()
    try {
      profile.value = await fetchProfile(profileId.value)
    } catch (e: any) {
      error.value = e?.message || 'Falha ao carregar os dados da conta'
    } finally {
      loading.value = false
    }
  }

  async function updateName(value: string) {
    if (!profileId.value) return
    saving.value = true
    clearFeedback()
    try {
      profile.value = await saveProfile(profileId.value, { name: value })
      success.value = 'Nome atualizado com sucesso.'
    } catch (e: any) {
      error.value = e?.message || 'Falha ao atualizar o nome'
    } finally {
      saving.value = false
    }
  }

  async function updateAvatar(file: File) {
    if (!profileId.value) return
    saving.value = true
    clearFeedback()
    try {
      profile.value = await saveProfile(profileId.value, { avatar: file })
      success.value = 'Foto de perfil atualizada com sucesso.'
    } catch (e: any) {
      error.value = e?.message || 'Falha ao enviar a foto de perfil'
    } finally {
      saving.value = false
    }
  }

  async function updateEmailVisibility(visible: boolean) {
    if (!profileId.value) return
    saving.value = true
    clearFeedback()
    try {
      profile.value = await saveProfile(profileId.value, { emailVisibility: visible })
      success.value = visible
        ? 'Seu e-mail agora aparece na sua perfil pública.'
        : 'Seu e-mail voltou a ser privado.'
    } catch (e: any) {
      error.value = e?.message || 'Falha ao atualizar a visibilidade do e-mail'
    } finally {
      saving.value = false
    }
  }

  async function changePassword(oldPassword: string, password: string, passwordConfirm: string) {
    if (!profileId.value) return
    saving.value = true
    clearFeedback()
    try {
      profile.value = await saveProfile(profileId.value, {
        oldPassword,
        password,
        passwordConfirm,
      })
      success.value = 'Senha alterada com sucesso.'
    } catch (e: any) {
      error.value = e?.message || 'Falha ao alterar a senha'
    } finally {
      saving.value = false
    }
  }

  return {
    profile,
    loading,
    saving,
    error,
    success,
    profileId,
    name,
    email,
    isVerified,
    hasAvatar,
    avatarUrl,
    initials,
    clearFeedback,
    load,
    updateName,
    updateAvatar,
    updateEmailVisibility,
    changePassword,
  }
})
