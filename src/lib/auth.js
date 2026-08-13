import { supabase } from './supabase.js'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function getUserDisplayName(user) {
  if (!user) return ''
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    '사용자'
  )
}

export function getUserAvatarUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
}
