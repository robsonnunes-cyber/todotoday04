import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import { Task } from '../types';
import { requestNotificationPermission, sendBrowserNotification, playNotificationSound } from '../services/notificationService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onOpenTask,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      sendBrowserNotification('Planner Kanban Pro', {
        body: 'Notificações ativadas com sucesso! Você será avisado de tarefas com prazos críticos.',
      });
      playNotificationSound();
    }
  };

  const handleTestNotification = () => {
    playNotificationSound();
    sendBrowserNotification('Planner Kanban Pro - Teste de Alerta', {
      body: 'Este é um exemplo de lembrete para tarefas com vencimento hoje!',
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const dueTodayTasks = pendingTasks.filter(t => t.dueDate === todayStr);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr);
  const urgentTasks = pendingTasks.filter(t => t.urgency === 'urgent');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Central de Lembretes & Notificações
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prazos urgentes do dia e alertas no navegador
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Permission Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white mb-0.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Notificações no Navegador (Web API)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Status atual: <strong className="capitalize">{permission === 'granted' ? 'Permitido ✅' : permission === 'denied' ? 'Bloqueado ❌' : 'Pendente ⏳'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Permitir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Testar Som</span>
                </button>
              )}
            </div>
          </div>

          {/* Today's Due Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Vencem Hoje ({dueTodayTasks.length})</span>
              </h4>
            </div>

            {dueTodayTasks.length > 0 ? (
              <div className="space-y-2">
                {dueTodayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onOpenTask(task);
                    }}
                    className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</h5>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">Vencimento Hoje</span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ver &gt;</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-center">
                Nenhuma tarefa agendada para entrega hoje.
              </p>
            )}
          </div>

          {/* Overdue Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Tarefas Atrasadas ({overdueTasks.length})</span>
              </h4>
            </div>

            {overdueTasks.length > 0 ? (
              <div className="space-y-2">
                {overdueTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onOpenTask(task);
                    }}
                    className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between cursor-pointer hover:border-rose-400 transition-colors"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</h5>
                      <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">Prazo era: {task.dueDate}</span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ver &gt;</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-center">
                Nenhuma tarefa atrasada! Parabéns. 🎉
              </p>
            )}
          </div>

          {/* Urgent Priority Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                <span>Prioridade Urgente Pendentes ({urgentTasks.length})</span>
              </h4>
            </div>

            {urgentTasks.length > 0 && (
              <div className="space-y-2">
                {urgentTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onOpenTask(task);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-blue-400"
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[280px]">
                      {task.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold shrink-0">
                      Urgente
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>

    </div>
  );
};
