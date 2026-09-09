import { Task, Assignee, AuthUser, Attachment } from '../types';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET_NAME } from '../lib/supabaseClient';

const STORAGE_AUTH_USER = 'today_todo_auth_user';
const STORAGE_AUTH_TOKEN = 'today_todo_auth_token';

export interface SupabaseStatus {
  configured: boolean;
  connected: boolean;
  tableReady?: boolean;
  storageReady?: boolean;
  hasUrl: boolean;
  hasKey: boolean;
  keyPreview?: string | null;
  url?: string;
  message: string;
  sqlScript?: string;
}

export const SQL_SCHEMA_SCRIPT = `-- ========================================================
-- SCHEMA OFICIAL SUPABASE - TODAY-TO-DO
-- Execute este script no "SQL Editor" do seu Supabase Dashboard
-- ========================================================

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

-- Garantir coluna recurrence
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'single';

-- 2. Tabela de Colaboradores / Membros
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'Colaborador',
  initials TEXT,
  color TEXT DEFAULT '#10B981',
  "avatarUrl" TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Todos autenticados podem ver e editar tarefas)
DROP POLICY IF EXISTS "Todos autenticados podem ver tarefas" ON public.tasks;
CREATE POLICY "Todos autenticados podem ver tarefas" 
ON public.tasks FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Todos autenticados podem criar tarefas" ON public.tasks;
CREATE POLICY "Todos autenticados podem criar tarefas" 
ON public.tasks FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Todos autenticados podem atualizar tarefas" ON public.tasks;
CREATE POLICY "Todos autenticados podem atualizar tarefas" 
ON public.tasks FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Todos autenticados podem excluir tarefas" ON public.tasks;
CREATE POLICY "Todos autenticados podem excluir tarefas" 
ON public.tasks FOR DELETE 
TO authenticated 
USING (true);

-- Políticas para Membros
DROP POLICY IF EXISTS "Todos autenticados podem ver membros" ON public.team_members;
CREATE POLICY "Todos autenticados podem ver membros" 
ON public.team_members FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Todos autenticados podem gerenciar membros" ON public.team_members;
CREATE POLICY "Todos autenticados podem gerenciar membros" 
ON public.team_members FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Acesso anônimo permitido (para inicialização suave antes do login)
DROP POLICY IF EXISTS "Permissao publica tasks" ON public.tasks;
CREATE POLICY "Permissao publica tasks" ON public.tasks FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao publica team" ON public.team_members;
CREATE POLICY "Permissao publica team" ON public.team_members FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Bucket de Storage para Anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage
DROP POLICY IF EXISTS "Leitura publica de anexos" ON storage.objects;
CREATE POLICY "Leitura publica de anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Upload de anexos" ON storage.objects;
CREATE POLICY "Upload de anexos"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Exclusao de anexos" ON storage.objects;
CREATE POLICY "Exclusao de anexos"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'task-attachments');
`;

export class SupabaseService {
  /**
   * Verifica o status da conexão direta com o Supabase
   */
  static async getStatus(): Promise<SupabaseStatus> {
    try {
      const hasUrl = Boolean(SUPABASE_URL && SUPABASE_URL.includes('supabase.co'));
      const hasKey = Boolean(SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20);

      // Testa a leitura da tabela tasks
      const { error } = await supabase.from('tasks').select('id').limit(1);

      if (error) {
        if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
          return {
            configured: true,
            connected: true,
            tableReady: false,
            hasUrl,
            hasKey,
            url: SUPABASE_URL,
            keyPreview: `${SUPABASE_ANON_KEY.substring(0, 16)}...`,
            message: "Conexão estabelecida! Execute o script SQL no seu Supabase Dashboard para criar a tabela 'tasks'.",
            sqlScript: SQL_SCHEMA_SCRIPT,
          };
        }

        return {
          configured: true,
          connected: false,
          tableReady: false,
          hasUrl,
          hasKey,
          url: SUPABASE_URL,
          keyPreview: `${SUPABASE_ANON_KEY.substring(0, 16)}...`,
          message: `Falha na consulta ao Supabase: ${error.message}`,
          sqlScript: SQL_SCHEMA_SCRIPT,
        };
      }

      return {
        configured: true,
        connected: true,
        tableReady: true,
        hasUrl,
        hasKey,
        url: SUPABASE_URL,
        keyPreview: `${SUPABASE_ANON_KEY.substring(0, 16)}...`,
        message: 'Conectado ao Supabase! Tabelas prontas e sincronização ativa.',
        sqlScript: SQL_SCHEMA_SCRIPT,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        configured: false,
        connected: false,
        hasUrl: false,
        hasKey: false,
        message: `Erro de conexão: ${msg}`,
        sqlScript: SQL_SCHEMA_SCRIPT,
      };
    }
  }

  /**
   * Busca todas as tarefas diretamente no Supabase
   */
  static async fetchTasks(): Promise<{ tasks: Task[]; error?: string; tableReady?: boolean }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
          return { tasks: [], error: "Tabela 'tasks' ainda não criada no Supabase.", tableReady: false };
        }
        return { tasks: [], error: error.message, tableReady: false };
      }

      return { tasks: (data as Task[]) || [], tableReady: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { tasks: [], error: msg };
    }
  }

  /**
   * Salva ou atualiza uma tarefa no Supabase
   */
  static async saveTask(task: Task): Promise<boolean> {
    try {
      const payload = {
        ...task,
        updatedAt: new Date().toISOString(),
      };
      const { error } = await supabase.from('tasks').upsert(payload);
      if (error) {
        console.warn('Supabase saveTask error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase saveTask error:', err);
      return false;
    }
  }

  /**
   * Atualiza campos específicos de uma tarefa
   */
  static async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const payload = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      if (error) {
        console.warn('Supabase updateTask error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase updateTask error:', err);
      return false;
    }
  }

  /**
   * Deleta uma tarefa no Supabase
   */
  static async deleteTask(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteTask error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteTask error:', err);
      return false;
    }
  }

  /**
   * Sincroniza em lote todas as tarefas
   */
  static async syncAllTasks(tasks: Task[]): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      if (!tasks || tasks.length === 0) {
        return { success: true, count: 0 };
      }

      const prepared = tasks.map((t, idx) => ({
        ...t,
        order: typeof t.order === 'number' ? t.order : idx,
        recurrence: t.recurrence || 'single',
        updatedAt: new Date().toISOString(),
      }));

      const { error } = await supabase.from('tasks').upsert(prepared);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, count: prepared.length };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Busca os membros da equipe no Supabase
   */
  static async fetchTeamMembers(): Promise<{ members: Assignee[]; error?: string }> {
    try {
      const { data, error } = await supabase.from('team_members').select('*');
      if (error) {
        return { members: [], error: error.message };
      }
      return { members: (data as Assignee[]) || [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { members: [], error: msg };
    }
  }

  /**
   * Salva ou atualiza um membro da equipe
   */
  static async saveTeamMember(member: Assignee): Promise<boolean> {
    try {
      const { error } = await supabase.from('team_members').upsert(member);
      if (error) {
        console.warn('Supabase saveTeamMember error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase saveTeamMember error:', err);
      return false;
    }
  }

  /**
   * Remove um membro da equipe
   */
  static async deleteTeamMember(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteTeamMember error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteTeamMember error:', err);
      return false;
    }
  }

  // ==========================================
  // UPLOAD DE ANEXOS (SUPABASE STORAGE)
  // ==========================================

  /**
   * Faz upload de arquivo para o bucket 'task-attachments' no Supabase Storage
   * Retorna o objeto Attachment com a URL pública permanente
   */
  static async uploadAttachment(file: File): Promise<{ attachment?: Attachment; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop() || 'dat';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniquePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanFileName}`;

      // Upload para o bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Supabase Storage upload warning:', uploadError.message);
        // Se o bucket não existir ou der erro de permissão, fallback para DataURL
        return this.fileToDataUrlAttachment(file);
      }

      // Obter URL pública
      const { data: publicData } = supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      const isImage = file.type.startsWith('image/');
      const newAtt: Attachment = {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: file.name,
        url: publicData.publicUrl,
        type: isImage ? 'image' : 'file',
        size: (file.size / 1024).toFixed(1) + ' KB',
        fileName: file.name,
      };

      return { attachment: newAtt };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Falha no upload para Storage, aplicando fallback:', msg);
      return this.fileToDataUrlAttachment(file);
    }
  }

  /**
   * Fallback offline / local caso o bucket de storage não esteja criado
   */
  private static fileToDataUrlAttachment(file: File): Promise<{ attachment: Attachment }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = (event.target?.result as string) || '';
        resolve({
          attachment: {
            id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            title: file.name,
            url: dataUrl,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            size: (file.size / 1024).toFixed(1) + ' KB',
            fileName: file.name,
          },
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // ==========================================
  // SUPABASE AUTHENTICATION METHODS (EMAIL/SENHA)
  // ==========================================

  /**
   * Login do colaborador via Supabase Auth com Email e Senha
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ user?: AuthUser; token?: string; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let friendlyMsg = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendlyMsg = 'E-mail ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMsg = 'E-mail ainda não confirmado no Supabase. Verifique sua caixa de entrada ou desative "Confirm email" no painel do Supabase.';
        }
        return { error: friendlyMsg };
      }

      const sbUser = data.user;
      if (!sbUser) {
        return { error: 'Nenhum usuário retornado pelo Supabase.' };
      }

      const meta = sbUser.user_metadata || {};
      const name = meta.name || cleanEmail.split('@')[0];
      const role = meta.role || 'Colaborador';
      const initials =
        meta.initials ||
        name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n: string) => n[0].toUpperCase())
          .join('') ||
        name.substring(0, 2).toUpperCase();

      const user: AuthUser = {
        id: sbUser.id,
        email: sbUser.email || cleanEmail,
        name,
        role,
        initials,
        color: '#10B981',
      };

      const token = data.session?.access_token || `token_${sbUser.id}`;
      this.setStoredAuth(user, token);

      return { user, token };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Erro na autenticação: ${msg}` };
    }
  }

  /**
   * Cadastro de novo colaborador no Supabase Auth
   */
  static async signUp(
    email: string,
    password: string,
    name: string,
    role: string
  ): Promise<{ user?: AuthUser; token?: string; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = (name && name.trim()) || cleanEmail.split('@')[0];
      const cleanRole = (role && role.trim()) || 'Colaborador';
      const initials =
        cleanName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n: string) => n[0].toUpperCase())
          .join('') || cleanName.substring(0, 2).toUpperCase();

      const { data, error } = await supabase.auth.signUp({
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

      if (error) {
        if (error.message?.toLowerCase().includes('already') || error.code === 'user_already_exists') {
          return { error: 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.' };
        }
        return { error: error.message };
      }

      const sbUser = data.user;
      if (!sbUser) {
        return { error: 'Falha ao registrar usuário no Supabase.' };
      }

      const user: AuthUser = {
        id: sbUser.id,
        email: cleanEmail,
        name: cleanName,
        role: cleanRole,
        initials,
        color: '#10B981',
      };

      // Registrar também na tabela pública de colaboradores
      await supabase.from('team_members').upsert({
        id: sbUser.id,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        initials,
        color: '#10B981',
      });

      const token = data.session?.access_token || `token_${sbUser.id}`;
      this.setStoredAuth(user, token);

      return { user, token };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Erro no cadastro: ${msg}` };
    }
  }

  /**
   * Verifica a sessão ativa atual no Supabase
   */
  static async getCurrentUser(_token?: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      // 1. Tenta obter a sessão diretamente do cliente Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && sessionData.session?.user) {
        const sbUser = sessionData.session.user;
        const meta = sbUser.user_metadata || {};
        const name = meta.name || sbUser.email?.split('@')[0] || 'Colaborador';
        const role = meta.role || 'Colaborador';
        const initials =
          meta.initials ||
          name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n: string) => n[0].toUpperCase())
            .join('') ||
          name.substring(0, 2).toUpperCase();

        const user: AuthUser = {
          id: sbUser.id,
          email: sbUser.email || '',
          name,
          role,
          initials,
          color: '#10B981',
        };
        return { user };
      }

      // 2. Fallback para dados salvos localmente
      const stored = this.getStoredAuth();
      if (stored.user) {
        return { user: stored.user };
      }

      return { error: 'Nenhuma sessão ativa' };
    } catch (err) {
      const stored = this.getStoredAuth();
      if (stored.user) {
        return { user: stored.user };
      }
      return { error: 'Erro ao verificar sessão' };
    }
  }

  /**
   * Encerra a sessão
   */
  static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      this.clearStoredAuth();
    }
  }

  /**
   * Recupera sessão armazenada
   */
  static getStoredAuth(): { user: AuthUser | null; token: string | null } {
    try {
      const token = localStorage.getItem(STORAGE_AUTH_TOKEN);
      const userRaw = localStorage.getItem(STORAGE_AUTH_USER);
      if (userRaw && token) {
        return { user: JSON.parse(userRaw), token };
      }
    } catch (e) {
      console.warn('Erro ao ler dados de autenticação:', e);
    }
    return { user: null, token: null };
  }

  /**
   * Salva sessão em armazenamento local
   */
  static setStoredAuth(user: AuthUser, token: string): void {
    try {
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_AUTH_TOKEN, token);
    } catch (e) {
      console.warn('Erro ao salvar autenticação:', e);
    }
  }

  /**
   * Limpa armazenamento local
   */
  static clearStoredAuth(): void {
    try {
      localStorage.removeItem(STORAGE_AUTH_USER);
      localStorage.removeItem(STORAGE_AUTH_TOKEN);
    } catch (e) {
      console.warn('Erro ao limpar autenticação:', e);
    }
  }

  /**
   * Retorna o script SQL completo
   */
  static getSchema(): string {
    return SQL_SCHEMA_SCRIPT;
  }
}
