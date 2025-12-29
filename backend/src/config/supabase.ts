import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase não configurado. Verifique as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-supabase-bypass-rls': 'true', // Bypass RLS com service role
    },
  },
});

export const SUPABASE_BUCKET = 'chamados-anexos';
