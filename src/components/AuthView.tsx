import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Briefcase, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { AuthUser } from '../types';
import { SupabaseService } from '../services/supabaseService';

interface AuthViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  
  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotMessage, setShowForgotMessage] = useState(false);

  // Sign up form fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('Colaborador');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Preencha seu e-mail e sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SupabaseService.login(loginEmail.trim(), loginPassword);
      if (res.error || !res.user) {
        setErrorMsg(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        setSuccessMsg(`Autenticado com sucesso! Carregando atividades...`);
        setTimeout(() => {
          onLoginSuccess(res.user!, res.token || 'token_active');
        }, 300);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Erro ao conectar ao Supabase: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signupName.trim()) {
      setErrorMsg('Informe o nome completo do colaborador.');
      return;
    }
    if (!signupEmail.trim()) {
      setErrorMsg('Informe um e-mail corporativo válido.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SupabaseService.signUp(
        signupEmail.trim(),
        signupPassword,
        signupName.trim(),
        signupRole.trim()
      );

      if (res.error || !res.user) {
        setErrorMsg(res.error || 'Não foi possível cadastrar o colaborador.');
      } else if (!res.token) {
        setSuccessMsg('Cadastro realizado no Supabase! Caso o seu projeto exija confirmação de e-mail, clique no link recebido. Se já desativou a confirmação, faça o login agora.');
        setLoginEmail(signupEmail.trim());
        setTab('login');
      } else {
        setSuccessMsg('Colaborador cadastrado no Supabase com sucesso! Entrando...');
        setTimeout(() => {
          onLoginSuccess(res.user!, res.token || 'token_active');
        }, 300);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Erro no cadastro: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
      
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-500/10 dark:bg-teal-500/5 blur-3xl pointer-events-none" />

      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button
          id="btn-toggle-theme-auth"
          type="button"
          onClick={onToggleDarkMode}
          className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 backdrop-blur-sm transition-all shadow-xs"
          title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-200">
        
        {/* Brand Header */}
        <div className="p-6 sm:p-8 text-center border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Today-To-Do
          </h1>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-1">
            Autenticação da Equipe • Supabase
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
            Acesso restrito aos colaboradores. Autentique-se para visualizar as atividades, quadro Kanban e relatórios.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 p-1.5 m-6 rounded-xl">
          <button
            id="tab-auth-login"
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Entrar na Equipe
          </button>
          <button
            id="tab-auth-signup"
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Novo Colaborador
          </button>
        </div>

        {/* Feedback Notifications */}
        {errorMsg && (
          <div className="mx-6 mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Forms Body */}
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail do Colaborador
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-auth-login-email"
                    type="email"
                    required
                    placeholder="seu.email@empresa.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Senha de Acesso
                  </label>
                  <button
                    id="btn-forgot-password"
                    type="button"
                    onClick={() => setShowForgotMessage(true)}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {/* Mensagem procurar pelo ADM */}
                {showForgotMessage && (
                  <div 
                    id="forgot-password-alert"
                    className="mb-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 transition-all shadow-2xs"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">
                      <p className="font-bold text-amber-800 dark:text-amber-300">Redefinição de Senha</p>
                      <p className="mt-0.5 text-[11.5px]">
                        Para redefinir ou recuperar sua senha de acesso, por favor <strong>procurar pelo ADM</strong> do sistema.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotMessage(false)}
                      className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 p-0.5"
                      title="Fechar aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-auth-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-auth-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando no Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Acessar Atividades</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-auth-signup-name"
                    type="text"
                    required
                    placeholder="Ex: Robson Nunes"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cargo / Função
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-auth-signup-role"
                    type="text"
                    required
                    placeholder="Ex: Gestor, Coordenador, Analista"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-auth-signup-email"
                    type="email"
                    required
                    placeholder="robson.nunes@somacsc.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Criar Senha (mínimo 6 dígitos)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="input-auth-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-auth-submit-signup"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Criando conta no Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Cadastrar Colaborador & Entrar</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="py-3 px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-400 dark:text-slate-500">
          Protegido por Supabase Auth • Criptografia e Row Level Security (RLS)
        </div>

      </div>

    </div>
  );
};
