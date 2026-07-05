import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ขาด environment variables: VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY. ' +
    'ดูวิธีตั้งค่าใน README.md'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
