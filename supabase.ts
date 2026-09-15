import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.trim() !== '' &&
  !rawUrl.includes('placeholder')
);

// Fallback prevents "Error: supabaseUrl is required" when building without env vars
const supabaseUrl = isSupabaseConfigured ? rawUrl! : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey! : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

