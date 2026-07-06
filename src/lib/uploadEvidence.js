import { supabase } from './supabaseClient'

// Uploads an image file to the "evidence" storage bucket and returns a public URL.
// Returns null if no file was given.
export async function uploadEvidence(file, folder = 'misc') {
  if (!file) return null
  const ext = file.name.split('.').pop()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('evidence').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('evidence').getPublicUrl(path)
  return data.publicUrl
}