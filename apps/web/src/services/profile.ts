import pb from './pocketbase'
import type { RecordModel } from 'pocketbase'

/**
 * Campos editáveis da própria conta.
 *
 * Usa `type` (e não `interface`) de propósito: só type alias recebe
 * index signature implícita e continua atribuível ao
 * `{ [key: string]: any }` esperado pelo SDK do PocketBase.
 */
export type ProfileUpdate = {
  name?: string
  emailVisibility?: boolean
  avatar?: File
  oldPassword?: string
  password?: string
  passwordConfirm?: string
}

/** Lê o registro completo do usuário logado. */
export function fetchProfile(id: string): Promise<RecordModel> {
  return pb.collection('users').getOne(id)
}

/**
 * Atualiza o registro do usuário logado.
 *
 * O dono de uma collection de auth sempre pode editar o próprio registro,
 * mesmo com `updateRule` vazia — por isso não é preciso regra extra.
 */
export function saveProfile(id: string, data: ProfileUpdate): Promise<RecordModel> {
  return pb.collection('users').update(id, data)
}
