import { supabase } from './supabase.js'

export const READING_SELECT = 'id, result, created_at, user_id, share_token'

export async function countSajuReadings() {
  const { data, error } = await supabase.rpc('count_saju_readings')
  if (error) throw error
  const next = Number(data)
  if (!Number.isFinite(next) || next < 0) return null
  return next
}

export async function listReadings() {
  const { data, error } = await supabase
    .from('saju_readings')
    .select(READING_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertReading(userId, result) {
  const { data, error } = await supabase
    .from('saju_readings')
    .insert({ result, user_id: userId })
    .select(READING_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateReadingResult(id, result) {
  const { data, error } = await supabase
    .from('saju_readings')
    .update({ result })
    .eq('id', id)
    .select(READING_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteReading(id) {
  const { error } = await supabase.from('saju_readings').delete().eq('id', id)
  if (error) throw error
}
