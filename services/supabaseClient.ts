import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseEnabled = Boolean(supabase);

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('demo_mode') === 'true';
  } catch {
    return false;
  }
};

export const isSupabaseActive = (): boolean => {
  return isSupabaseEnabled && !isDemoMode();
};
