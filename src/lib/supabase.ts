import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient<any>> | undefined;
};

export const supabase = globalForSupabase.supabase ?? createClient<any>(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase;
