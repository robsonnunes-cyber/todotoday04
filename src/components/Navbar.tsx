import React from 'react';
import { 
  Kanban, 
  List, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Plus, 
  Sun, 
  Moon, 
  Bell, 
  Sparkles,
  FileSpreadsheet,
  CircleDollarSign,
  LogOut
} from 'lucide-react';
import { ViewMode, AuthUser } from '../types';

interface NavbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenNewTask: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenNotifications: () => void;
  onOpenSpreadsheet: () => void;
  urgentDueCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  onViewModeChange,
  onOpenNewTask,
  darkMode,
  onToggleDarkMode,
  onOpenNotifications,
  onOpenSpreadsheet,
  urgentDueCount,
  currentUser,
  onLogout,
}) => {
  const navItems: { mode: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: 'kanban', label: 'Quadro Kanban', icon: Kanban },
    { mode: 'list', label: 'Lista', icon: List },
    { mode: 'calendar', label: 'Calendário', icon: CalendarIcon },
    { mode: 'reports', label: 'Métricas & Relatórios', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo with Financial Icon & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 text-white shadow-sm shadow-emerald-500/20">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Today-To-Do
                </h1>
              </div>
            </div>
          </div>

          {/* Center Navigation View Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = viewMode === item.mode;
              return (
                <button
                  key={item.mode}
                  id={`nav-view-${item.mode}`}
                  onClick={() => onViewModeChange(item.mode)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Import Spreadsheet Button */}
            <button
              id="btn-spreadsheet-import"
              onClick={onOpenSpreadsheet}
              title="Subir tarefas através de planilha (.csv ou .xlsx)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Planilha</span>
            </button>

            {/* Notifications Bell */}
            <button
              id="btn-notifications"
              onClick={onOpenNotifications}
              title="Notificações e Lembretes de Prazos"
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {urgentDueCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
              )}
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              id="btn-toggle-theme"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Add Task Button */}
            <button
              id="btn-new-task-header"
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </button>

            {/* Authenticated Team User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
                  style={{ backgroundColor: currentUser.color || '#10B981' }}
                  title={`${currentUser.name} (${currentUser.role}) • ${currentUser.email}`}
                >
                  {currentUser.initials}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[120px] truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                    {currentUser.role}
                  </div>
                </div>
                {onLogout && (
                  <button
                    id="btn-navbar-logout"
                    onClick={onLogout}
                    title="Encerrar sessão na equipe"
                    className="flex items-center gap-1 p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden md:inline text-xs font-medium">Sair</span>
                  </button>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Mobile View Switcher Tab bar */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => onViewModeChange(item.mode)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};

