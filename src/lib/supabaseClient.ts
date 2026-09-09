/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fallback project defaults (substituíveis por variáveis de ambiente na Vercel)
const DEFAULT_SUPABASE_URL = 'https://ahvcdqsmbaumzqxbwozy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_U00DQZTRNfC7FfxuJOS12Q_RqC8Uhhm';

/**
 * Normaliza e valida a URL do Supabase
 */
function normalizeSupabaseUrl(raw?: string): string {
  if (!raw) return DEFAULT_SUPABASE_URL;
  let url = raw.trim().replace(/^["']|["']$/g, '');
  if (!url) return DEFAULT_SUPABASE_URL;

  // Se a pessoa colou uma chave no lugar da URL
  if (url.startsWith('sb_') || url.startsWith('eyJ') || (!url.includes('.') && url.length > 25)) {
    console.warn('[Supabase] Chave detectada no lugar da URL. Usando URL padrão.');
    return DEFAULT_SUPABASE_URL;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return DEFAULT_SUPABASE_URL;
  }
}

/**
 * Normaliza a chave pública (Anon / Publishable)
 */
function normalizeSupabaseKey(raw?: string): string {
  if (!raw) return DEFAULT_SUPABASE_ANON_KEY;
  const key = raw.trim().replace(/^["']|["']$/g, '');
  return key || DEFAULT_SUPABASE_ANON_KEY;
}

// Resolução de variáveis de ambiente com suporte prioritário a Vite (VITE_*)
const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL);

const envKey =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_KEY)) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_KEY)) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_KEY);

export const SUPABASE_URL = normalizeSupabaseUrl(envUrl);
export const SUPABASE_ANON_KEY = normalizeSupabaseKey(envKey);

/**
 * Cliente Supabase com persistência de sessão e auto-refresh do token JWT
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const STORAGE_BUCKET_NAME = 'task-attachments';
