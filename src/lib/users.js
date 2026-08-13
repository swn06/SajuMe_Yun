import { supabase } from './supabase.js'

export const USER_SELECT =
  'id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at'

export function profilePayloadFromForm({ name, birthDate, birthTime, gender, calendarType }) {
  return {
    name,
    birth_date: birthDate,
    birth_time: birthTime || null,
    gender,
    calendar_type: calendarType,
  }
}

export function hasCompleteProfile(profile) {
  return Boolean(profile?.name && profile?.birth_date && profile?.gender)
}

export async function loadUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserProfile(userId, profile) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, ...profile }, { onConflict: 'id' })
    .select(USER_SELECT)
    .single()

  if (error) throw error
  return data
}
