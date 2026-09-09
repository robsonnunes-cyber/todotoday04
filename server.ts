import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Supabase Configuration
// Project URL provided by user: https://ahvcdqsmbaumzqxbwozy.supabase.co
// Publishable key provided by user: sb_publishable_U00DQZTRNfC7FfxuJOS12Q_RqC8Uhhm
const DEFAULT_SUPABASE_URL = 'https://ahvcdqsmbaumzqxbwozy.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_U00DQZTRNfC7FfxuJOS12Q_RqC8Uhhm';

let cachedSupabaseClient: SupabaseClient | null = null;
let currentClientUrl: string | null = null;

function parseSupabaseUrl(raw?: string): { url: string | null; isKey: boolean; error?: string } {
  if (!raw) return { url: null, isKey: false };
  let cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (!cleaned) return { url: null, isKey: false };

  // Detect if user pasted the API key into SUPABASE_URL
  if (
    cleaned.startsWith('sb_publishable_') ||
    cleaned.startsWith('sb_secret_') ||
    cleaned.startsWith('eyJ') ||
    (!cleaned.includes('.') && cleaned.length > 25)
  ) {
    return {
      url: null,
      isKey: true,
      error: 'A chave de API (sb_publishable_...) foi inserida no campo SUPABASE_URL.',
    };
  }

  // Prepend https:// if user only wrote xxxx.supabase.co
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        url: null,
        isKey: false,
        error: `Protocolo inválido "${parsed.protocol}". A URL do Supabase deve usar https:// (ex: https://xyz.supabase.co).`,
      };
    }
    // Return base origin to cleanly handle paths like /rest/v1/
    return { url: parsed.origin, isKey: false };
  } catch {
    return {
      url: null,
      isKey: false,
      error: `Formato de URL inválido: "${raw}". A URL deve ter o formato https://[id-do-projeto].supabase.co`,
    };
  }
}

function resolveSupabaseCredentials(): { url: string; key: string } {
  let envUrl = process.env.SUPABASE_URL?.trim();
  let envKey = process.env.SUPABASE_KEY?.trim();

  // If SUPABASE_URL was set to the API key by mistake, use it as key
  if (envUrl && (envUrl.startsWith('sb_publishable_') || envUrl.startsWith('sb_') || envUrl.startsWith('eyJ'))) {
    if (!envKey) {
      envKey = envUrl;
    }
    envUrl = undefined;
  }

  const { url } = parseSupabaseUrl(envUrl);
  const effectiveUrl = url || DEFAULT_SUPABASE_URL;
  const effectiveKey = envKey || DEFAULT_SUPABASE_KEY;

  return { url: effectiveUrl, key: effectiveKey };
}

function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = resolveSupabaseCredentials();

  try {
    if (!cachedSupabaseClient || currentClientUrl !== url) {
      cachedSupabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      currentClientUrl = url;
    }
    return cachedSupabaseClient;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Falha ao inicializar createClient do Supabase:', msg);
    return null;
  }
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const { url } = resolveSupabaseCredentials();
  const secretKey = process.env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY;
  try {
    return createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err: unknown) {
    console.warn('Falha ao inicializar client admin do Supabase:', err);
    return null;
  }
}

// SQL Schema script for user reference
const SQL_SCHEMA_SCRIPT = `-- ==========================================
-- Schema para Today-To-Do no Supabase
-- Cole e execute este script no "SQL Editor" do seu Supabase Dashboard
-- ==========================================

-- 1. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  company TEXT DEFAULT '',
  ticket TEXT DEFAULT '',
  status TEXT DEFAULT 'todo',
  urgency TEXT DEFAULT 'medium',
  recurrence TEXT DEFAULT 'single',
  assignees JSONB DEFAULT '[]'::jsonb,
  "dueDate" TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  subtasks JSONB DEFAULT '[]'::jsonb,
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna recurrence se tabela já existia
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'single';

-- 2. Tabela de Colaboradores / Membros
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'Colaborador',
  initials TEXT,
  color TEXT DEFAULT '#3B82F6',
  "avatarUrl" TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso para a chave Publishable
DROP POLICY IF EXISTS "Leitura de tarefas" ON public.tasks;
CREATE POLICY "Leitura de tarefas" ON public.tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escrita de tarefas" ON public.tasks;
CREATE POLICY "Escrita de tarefas" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de membros" ON public.team_members;
CREATE POLICY "Leitura de membros" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escrita de membros" ON public.team_members;
CREATE POLICY "Escrita de membros" ON public.team_members FOR ALL USING (true) WITH CHECK (true);
`;

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Supabase connection status check
app.get('/api/supabase/status', async (_req, res) => {
  const { url, key } = resolveSupabaseCredentials();

  try {
    const client = getSupabaseClient();
    if (!client) {
      return res.json({
        configured: false,
        connected: false,
        hasUrl: !!url,
        hasKey: !!key,
        url,
        message: 'Falha ao inicializar o cliente Supabase.',
        sqlScript: SQL_SCHEMA_SCRIPT,
      });
    }

    // Ping tasks table to see if connection works and table exists
    const { data, error } = await client.from('tasks').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
        return res.json({
          configured: true,
          connected: true,
          tableReady: false,
          hasUrl: true,
          hasKey: true,
          url,
          keyPreview: `${key.substring(0, 16)}...`,
          message: "Conexão com Supabase estabelecida! A tabela 'tasks' precisa ser criada no SQL Editor.",
          sqlScript: SQL_SCHEMA_SCRIPT,
        });
      }
      return res.json({
        configured: true,
        connected: false,
        hasUrl: true,
        hasKey: true,
        url,
        keyPreview: `${key.substring(0, 16)}...`,
        message: `Falha na requisição ao Supabase: ${error.message}`,
        sqlScript: SQL_SCHEMA_SCRIPT,
      });
    }

    return res.json({
      configured: true,
      connected: true,
      tableReady: true,
      hasUrl: true,
      hasKey: true,
      url,
      keyPreview: `${key.substring(0, 16)}...`,
      message: 'Conexão com Supabase ativa e tabelas prontas!',
      sqlScript: SQL_SCHEMA_SCRIPT,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.json({
      configured: true,
      connected: false,
      hasUrl: true,
      hasKey: true,
      url,
      message: `Erro ao conectar: ${msg}`,
      sqlScript: SQL_SCHEMA_SCRIPT,
    });
  }
});

// SQL Schema script retrieval
app.get('/api/supabase/schema', (_req, res) => {
  res.json({ script: SQL_SCHEMA_SCRIPT });
});

// ==========================================
// SUPABASE AUTHENTICATION ENDPOINTS
// ==========================================

// Register / Sign up team member in Supabase Auth
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(500).json({ error: 'Supabase não conectado.' });
  }

  try {
    const admin = getSupabaseAdminClient();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && String(name).trim()) || cleanEmail.split('@')[0];
    const cleanRole = (role && String(role).trim()) || 'Colaborador';
    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n: string) => n[0].toUpperCase())
      .join('') || cleanName.substring(0, 2).toUpperCase();

    let createdUser: any = null;
    let sessionToken: string | null = null;
    let expiresAt: number | undefined = undefined;

    // Use admin client to pre-confirm email if available so users can immediately log in
    if (admin?.auth?.admin) {
      const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: cleanName,
          role: cleanRole,
          initials,
        },
      });

      if (createError) {
        const errorMsg = createError.message?.toLowerCase() || '';
        if (errorMsg.includes('already') || createError.code === 'user_already_exists') {
          return res.status(400).json({ error: 'Este e-mail já está cadastrado. Realize o login.' });
        }
        return res.status(400).json({ error: createError.message });
      }

      createdUser = createData.user;
    } else {
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            role: cleanRole,
            initials,
          },
        },
      });

      if (signUpError) {
        return res.status(400).json({ error: signUpError.message });
      }
      createdUser = signUpData.user;
      sessionToken = signUpData.session?.access_token || null;
      expiresAt = signUpData.session?.expires_at;
    }

    // Now sign in to get access token session
    const { data: signInData } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInData?.session) {
      sessionToken = signInData.session.access_token;
      expiresAt = signInData.session.expires_at;
      if (signInData.user) {
        createdUser = signInData.user;
      }
    }

    // Also register in public.team_members table for instant team directory sync
    if (createdUser) {
      try {
        await client.from('team_members').upsert({
          id: createdUser.id,
          name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          initials,
          color: '#10B981',
        });
      } catch (e) {
        console.warn('Sync to team_members warning:', e);
      }
    }

    return res.json({
      user: {
        id: createdUser?.id,
        email: cleanEmail,
        name: cleanName,
        role: cleanRole,
        initials,
        color: '#10B981',
      },
      token: sessionToken || `session_${createdUser?.id}`,
      expiresAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro no cadastro: ${msg}` });
  }
});

// Login team member with Supabase Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(500).json({ error: 'Supabase não conectado.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    let { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // If unconfirmed, attempt admin auto-confirm and retry
    if (error && (error.message?.toLowerCase().includes('not confirmed') || error.code === 'email_not_confirmed')) {
      const admin = getSupabaseAdminClient();
      if (admin?.auth?.admin) {
        const { data: list } = await admin.auth.admin.listUsers();
        const targetUser = list?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (targetUser) {
          await admin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
          const retry = await client.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          data = retry.data;
          error = retry.error;
        }
      }
    }

    if (error) {
      let friendlyMsg = error.message;
      if (error.message?.includes('Invalid login credentials')) {
        friendlyMsg = 'E-mail ou senha incorretos.';
      } else if (error.message?.includes('Email not confirmed')) {
        friendlyMsg = 'E-mail ainda não confirmado no Supabase.';
      }
      return res.status(401).json({ error: friendlyMsg });
    }

    const user = data.user;
    const meta = user?.user_metadata || {};
    const name = meta.name || cleanEmail.split('@')[0];
    const role = meta.role || 'Colaborador';
    const initials = meta.initials || name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n: string) => n[0].toUpperCase())
      .join('') || name.substring(0, 2).toUpperCase();

    return res.json({
      user: {
        id: user?.id,
        email: user?.email || cleanEmail,
        name,
        role,
        initials,
        color: '#10B981',
      },
      token: data.session?.access_token || `session_${user?.id}`,
      expiresAt: data.session?.expires_at,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro no login: ${msg}` });
  }
});

// Reset password endpoint for self-service or team recovery
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Informe e-mail e nova senha (mínimo 6 dígitos).' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  const client = getSupabaseClient();
  const admin = getSupabaseAdminClient();
  if (!client || !admin) {
    return res.status(500).json({ error: 'Supabase não conectado.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in auth.users
    const { data: list } = await admin.auth.admin.listUsers();
    let targetUser = list?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);

    if (targetUser) {
      const { error: updateErr } = await admin.auth.admin.updateUserById(targetUser.id, {
        password: newPassword,
        email_confirm: true,
      });
      if (updateErr) {
        return res.status(400).json({ error: updateErr.message });
      }
    } else {
      // Find team member info if available
      const { data: member } = await client.from('team_members').select('*').eq('email', cleanEmail).maybeSingle();
      const userName = member?.name || cleanEmail.split('@')[0];
      const userRole = member?.role || 'Colaborador';
      const initials = member?.initials || userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

      const { data: createData, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          name: userName,
          role: userRole,
          initials,
        },
      });

      if (createErr) {
        return res.status(400).json({ error: createErr.message });
      }
      targetUser = createData.user;
    }

    // Now sign in with the new password
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: newPassword,
    });

    const meta = targetUser.user_metadata || {};
    const name = meta.name || cleanEmail.split('@')[0];
    const role = meta.role || 'Colaborador';
    const initials = meta.initials || name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

    return res.json({
      success: true,
      message: 'Senha alterada com sucesso!',
      user: {
        id: targetUser.id,
        email: cleanEmail,
        name,
        role,
        initials,
        color: '#10B981',
      },
      token: signInData?.session?.access_token || `session_${targetUser.id}`,
      expiresAt: signInData?.session?.expires_at,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro ao redefinir senha: ${msg}` });
  }
});

// Quick login for registered team members
app.post('/api/auth/quick-login', async (req, res) => {
  const { id, email } = req.body;
  if (!id && !email) {
    return res.status(400).json({ error: 'Informe o ID ou e-mail do colaborador.' });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(500).json({ error: 'Supabase não conectado.' });
  }

  try {
    let query = client.from('team_members').select('*');
    if (id) {
      query = query.eq('id', id);
    } else if (email) {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data: member, error } = await query.maybeSingle();
    if (error || !member) {
      return res.status(404).json({ error: 'Colaborador não encontrado na equipe.' });
    }

    const initials = member.initials || member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    const token = `session_${member.id}`;

    return res.json({
      success: true,
      user: {
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role || 'Colaborador',
        initials,
        color: member.color || '#10B981',
        avatar: member.avatarUrl || '',
      },
      token,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Erro no acesso rápido: ${msg}` });
  }
});

// Verify current session with Supabase Auth or team token
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(500).json({ error: 'Supabase não conectado' });
  }

  try {
    // 1. If it is a session_<id> token from quick login
    if (token.startsWith('session_')) {
      const memberId = token.replace('session_', '');
      const { data: member } = await client.from('team_members').select('*').eq('id', memberId).maybeSingle();
      if (member) {
        const initials = member.initials || member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
        return res.json({
          user: {
            id: member.id,
            email: member.email,
            name: member.name,
            role: member.role || 'Colaborador',
            initials,
            color: member.color || '#10B981',
            avatar: member.avatarUrl || '',
          },
        });
      }
    }

    // 2. Standard Supabase JWT token verification
    const { data, error } = await client.auth.getUser(token);
    if (!error && data?.user) {
      const user = data.user;
      const meta = user.user_metadata || {};
      const name = meta.name || user.email?.split('@')[0] || 'Colaborador';
      const role = meta.role || 'Colaborador';
      const initials = meta.initials || name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n: string) => n[0].toUpperCase())
        .join('') || name.substring(0, 2).toUpperCase();

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name,
          role,
          initials,
          color: '#10B981',
        },
      });
    }

    // 3. Fallback: check if token matches any user ID directly
    const { data: memberByToken } = await client.from('team_members').select('*').eq('id', token).maybeSingle();
    if (memberByToken) {
      const initials = memberByToken.initials || memberByToken.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      return res.json({
        user: {
          id: memberByToken.id,
          email: memberByToken.email,
          name: memberByToken.name,
          role: memberByToken.role || 'Colaborador',
          initials,
          color: memberByToken.color || '#10B981',
          avatar: memberByToken.avatarUrl || '',
        },
      });
    }

    return res.status(401).json({ error: 'Sessão expirada ou inválida' });
  } catch (err: unknown) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (_req, res) => {
  return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

// Get quick accounts list for team switcher / testing
app.get('/api/auth/quick-accounts', async (_req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.json({ accounts: [] });
  }

  try {
    const { data } = await client.from('team_members').select('id, name, email, role, initials, color').order('name', { ascending: true }).limit(20);
    return res.json({ accounts: data || [] });
  } catch {
    return res.json({ accounts: [] });
  }
});

// Helper to pack recurrence into tags as a fail-safe backup in case recurrence column doesn't exist in Supabase
function packRecurrenceIntoTags(tags: any, recurrence?: string): string[] {
  const cleanTags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string' && !t.startsWith('__rec:')) : [];
  const rec = recurrence && recurrence !== 'single' ? recurrence : 'single';
  return [...cleanTags, `__rec:${rec}`];
}

// Helper to unpack recurrence from task returned by Supabase
function unpackTaskRecurrence(t: any) {
  const cleanTags = Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string' && !tag.startsWith('__rec:')) : [];
  const recTag = Array.isArray(t.tags) ? t.tags.find((tag: any) => typeof tag === 'string' && tag.startsWith('__rec:')) : null;
  const inferredRec = (t.recurrence && t.recurrence !== 'single')
    ? t.recurrence
    : (recTag ? recTag.replace('__rec:', '') : (t.recurrence || 'single'));

  return {
    ...t,
    recurrence: inferredRec,
    tags: cleanTags,
  };
}

// Get tasks from Supabase
app.get('/api/tasks', async (_req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ 
      error: 'Supabase não configurado. Defina SUPABASE_URL.',
      configured: false 
    });
  }

  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
        return res.status(404).json({
          tableReady: false,
          error: "Tabela 'tasks' não encontrada no banco de dados.",
          sqlScript: SQL_SCHEMA_SCRIPT,
        });
      }
      return res.status(500).json({ error: error.message });
    }

    const processedTasks = (data || []).map(unpackTaskRecurrence);
    return res.json({ tasks: processedTasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Create or upsert single task
app.post('/api/tasks', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado. Defina SUPABASE_URL.' });
  }

  const task = req.body;
  if (!task || !task.id) {
    return res.status(400).json({ error: 'ID da tarefa obrigatório.' });
  }

  try {
    const recurrence = task.recurrence || 'single';
    const tagsWithRec = packRecurrenceIntoTags(task.tags, recurrence);

    const basePayload: any = {
      id: task.id,
      title: task.title || '',
      description: task.description || '',
      company: task.company || '',
      ticket: task.ticket || '',
      status: task.status || 'todo',
      urgency: task.urgency || 'medium',
      assignees: Array.isArray(task.assignees) ? task.assignees : [],
      dueDate: task.dueDate || null,
      tags: tagsWithRec,
      attachments: Array.isArray(task.attachments) ? task.attachments : [],
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      order: typeof task.order === 'number' ? task.order : 0,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // First attempt: try with recurrence column
    let { data, error } = await client
      .from('tasks')
      .upsert({ ...basePayload, recurrence }, { onConflict: 'id' })
      .select();

    // If recurrence column does not exist in schema cache, fallback to saving without it (safely preserved in tagsWithRec)
    if (error && (error.message?.toLowerCase().includes('recurrence') || error.code === '42703')) {
      const fallback = await client
        .from('tasks')
        .upsert(basePayload, { onConflict: 'id' })
        .select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const saved = data?.[0] || basePayload;
    return res.json({ success: true, task: unpackTaskRecurrence({ ...saved, recurrence }) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado.' });
  }

  const { id } = req.params;
  const updates: any = { ...req.body, updatedAt: new Date().toISOString() };

  try {
    // If recurrence or tags are updated, ensure tagsWithRec is maintained
    if (updates.recurrence !== undefined || updates.tags !== undefined) {
      const targetRecurrence = updates.recurrence;
      if (updates.tags !== undefined) {
        updates.tags = packRecurrenceIntoTags(updates.tags, targetRecurrence);
      } else if (targetRecurrence !== undefined) {
        // Fetch current tags to embed recurrence
        const { data: cur } = await client.from('tasks').select('tags').eq('id', id).single();
        if (cur) {
          updates.tags = packRecurrenceIntoTags(cur.tags, targetRecurrence);
        }
      }
    }

    let { data, error } = await client
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select();

    // If recurrence column does not exist in schema cache, omit recurrence field and retry
    if (error && (error.message?.toLowerCase().includes('recurrence') || error.code === '42703')) {
      const { recurrence: _ignored, ...updatesWithoutRec } = updates;
      const fallback = await client
        .from('tasks')
        .update(updatesWithoutRec)
        .eq('id', id)
        .select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const result = data?.[0] ? unpackTaskRecurrence(data[0]) : unpackTaskRecurrence(updates);
    return res.json({ success: true, task: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado.' });
  }

  const { id } = req.params;

  try {
    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Batch sync tasks
app.post('/api/tasks/sync', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado. Defina SUPABASE_URL.' });
  }

  const { tasks } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'Nenhuma tarefa fornecida.' });
  }

  try {
    const formatted = tasks.map((t: any) => ({
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      company: t.company || '',
      ticket: t.ticket || '',
      status: t.status || 'todo',
      urgency: t.urgency || 'medium',
      recurrence: t.recurrence || 'single',
      assignees: Array.isArray(t.assignees) ? t.assignees : [],
      dueDate: t.dueDate || null,
      tags: packRecurrenceIntoTags(t.tags, t.recurrence),
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      order: typeof t.order === 'number' ? t.order : 0,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    }));

    let { data, error } = await client
      .from('tasks')
      .upsert(formatted, { onConflict: 'id' })
      .select();

    if (error && (error.message?.toLowerCase().includes('recurrence') || error.code === '42703')) {
      const formattedWithoutRec = formatted.map(({ recurrence: _rec, ...rest }: any) => rest);
      const fallback = await client
        .from('tasks')
        .upsert(formattedWithoutRec, { onConflict: 'id' })
        .select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, count: data?.length || formatted.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Get team members
app.get('/api/team', async (_req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado.' });
  }

  try {
    const { data, error } = await client.from('team_members').select('*');
    if (error) {
      if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
        return res.status(404).json({ tableReady: false, error: "Tabela 'team_members' não encontrada." });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ members: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Create/Update team member
app.post('/api/team', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado.' });
  }

  const member = req.body;
  if (!member || !member.id) {
    return res.status(400).json({ error: 'ID do membro obrigatório.' });
  }

  try {
    const payload = {
      id: member.id,
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'Colaborador',
      initials: member.initials || member.name?.substring(0, 2).toUpperCase() || 'CO',
      color: member.color || '#3B82F6',
      avatarUrl: member.avatarUrl || member.avatar || '',
      createdAt: member.createdAt || new Date().toISOString(),
    };

    const { data, error } = await client
      .from('team_members')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, member: data?.[0] || payload });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// Delete team member
app.delete('/api/team/:id', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ error: 'Supabase não configurado.' });
  }

  const { id } = req.params;

  try {
    const { error } = await client.from('team_members').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// ==========================================
// VITE SPA MIDDLEWARE / PRODUCTION STATIC
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Today-To-Do Full-Stack Server running on http://0.0.0.0:${PORT}`);
    console.log(`Supabase Key: configured (prefix: ${DEFAULT_SUPABASE_KEY.substring(0, 15)}...)`);
  });
}

startServer();
