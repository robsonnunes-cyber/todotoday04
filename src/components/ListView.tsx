import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckSquare, 
  Layers, 
  Filter,
  Plus,
  Building2,
  Ticket,
  Repeat,
  FileText,
  Paperclip
} from 'lucide-react';
import { Task, TaskStatus, TaskUrgency } from '../types';
import { getTagStyle } from '../data/initialData';
import { getDueDateStatus } from '../utils/dateUtils';
import { formatMonthYearLabel } from './MonthYearFilterBar';

interface ListViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddNewTask: () => void;
  onToggleRecurrence?: (taskId: string) => void;
}

const urgencyWeight: Record<TaskUrgency, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onToggleSubtask,
  onAddNewTask,
  onToggleRecurrence,
}) => {
  const [groupBy, setGroupBy] = useState<'status' | 'urgency' | 'month' | 'recurrence' | 'none'>('status');

  const getUrgencyBadge = (urgency: TaskUrgency) => {
    switch (urgency) {
      case 'urgent':
      case 'high':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">Alta</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">Média</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">Baixa</span>;
    }
  };

  const getDueDateFormatted = (dueDate: string, status: TaskStatus) => {
    if (!dueDate) return <span className="text-xs text-slate-400">Sem prazo</span>;
    
    const info = getDueDateStatus(dueDate, status === 'done');

    if (status === 'done') {
      return <span className="text-xs text-slate-500">{info.formattedBR}</span>;
    }

    if (info.isOverdue) {
      return <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">⚠️ {info.formattedBR} (Atrasada)</span>;
    }

    if (info.isToday) {
      return <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">📅 {info.formattedBR} (Hoje)</span>;
    }

    if (info.isTomorrow) {
      return <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">{info.formattedBR} (Amanhã)</span>;
    }

    return <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{info.formattedBR}</span>;
  };

  // Classificar tarefas por data de vencimento e depois prioridade
  const sortTasksByDefault = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      // 1. Data de vencimento primeiro
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        const diff = a.dueDate.localeCompare(b.dueDate);
        if (diff !== 0) return diff;
      }
      // 2. Prioridade / Urgência secundária
      return (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
    });
  };

  const renderGroup = (title: string, groupTasks: Task[]) => {
    const sortedTasks = sortTasksByDefault(groupTasks);

    return (
      <div key={title} className="mb-6 last:mb-0">
        <div className="flex items-center justify-between py-2 px-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {title}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {sortedTasks.length}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4">Tarefa & Chamado</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Urgência (Mais → Menos)</th>
                  <th className="py-3 px-4">Data de Entrega</th>
                  <th className="py-3 px-4">Responsáveis</th>
                  <th className="py-3 px-4">Subtarefas</th>
                  <th className="py-3 px-4">Anexos</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedTasks.map((task) => {
                  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;
                  const attachmentsCount = task.attachments?.length || 0;
                  const isRecurring = Boolean(task.recurrence && task.recurrence !== 'single');
                  const recurrenceText = 
                    task.recurrence === 'daily' ? 'Diária' :
                    task.recurrence === 'weekly' ? 'Semanal' :
                    task.recurrence === 'monthly' ? 'Mensal' :
                    task.recurrence === 'yearly' ? 'Anual' : 'Avulso';

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onEditTask(task)}
                    >
                      {/* Status Column */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const nextStatus: TaskStatus = 
                              task.status === 'todo' ? 'in_progress' : 
                              task.status === 'in_progress' ? 'done' : 'todo';
                            onStatusChange(task.id, nextStatus);
                          }}
                          title={`Status atual: ${task.status}. Clique para alternar.`}
                          className="hover:scale-110 transition-transform inline-block"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 hover:text-emerald-600" />
                          ) : task.status === 'in_progress' ? (
                            <Clock className="w-5 h-5 text-amber-500 hover:text-amber-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Title, Company, Description & Ticket */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 max-w-md">
                          <span className={`font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                            task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}>
                            {task.title}
                          </span>

                          {/* Company below title */}
                          {task.company && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                              <span>{task.company}</span>
                            </div>
                          )}
                          
                          {task.description && (
                            <span className="text-slate-500 dark:text-slate-400 line-clamp-1 text-[11px]">
                              {task.description}
                            </span>
                          )}

                          {/* Ticket (Chamado) below description */}
                          {task.ticket && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Ticket className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                <span>Chamado: {task.ticket}</span>
                              </span>
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${getTagStyle(tag)}`}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Planner Recurrence Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleRecurrence) onToggleRecurrence(task.id);
                          }}
                          title={isRecurring ? `Tarefa Recorrente (${recurrenceText}) - Clique para alternar para avulsa` : 'Tarefa Avulsa - Clique para tornar recorrente mensal'}
                          className="hover:scale-105 transition-transform inline-flex items-center"
                        >
                          {isRecurring ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/80">
                              <Repeat className="w-3 h-3 text-indigo-500" />
                              <span>{recurrenceText}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>Avulso</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Urgency */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getUrgencyBadge(task.urgency)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getDueDateFormatted(task.dueDate, task.status)}
                      </td>

                      {/* Assignees */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-1.5">
                          {task.assignees && task.assignees.length > 0 ? (
                            task.assignees.map((user) => (
                              <div
                                key={user.id}
                                title={user.email ? `${user.name} (${user.role}) • ${user.email}` : `${user.name} (${user.role})`}
                                className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden shrink-0 shadow-2xs"
                              >
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${user.color || 'bg-blue-600 text-white'}`}>
                                    {user.initials}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Nenhum</span>
                          )}
                        </div>
                      </td>

                      {/* Checklist */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {totalSubtasks > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            <CheckSquare className="w-3 h-3 text-blue-500" />
                            {completedSubtasks}/{totalSubtasks}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Attachments */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {attachmentsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                            <Paperclip className="w-3 h-3 text-blue-500" />
                            {attachmentsCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditTask(task)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Editar Tarefa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Excluir Tarefa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header controls for grouping */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Agrupar por:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setGroupBy('status')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'status'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setGroupBy('urgency')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'urgency'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Urgência
            </button>
            <button
              onClick={() => setGroupBy('recurrence')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'recurrence'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tipo (Planner)
            </button>
            <button
              onClick={() => setGroupBy('month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'month'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mês / Ano
            </button>
            <button
              onClick={() => setGroupBy('none')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'none'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sem Agrupamento
            </button>
          </div>
        </div>

        <button
          onClick={onAddNewTask}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Task groups */}
      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Nenhuma tarefa encontrada com os filtros atuais.
          </p>
        </div>
      ) : groupBy === 'status' ? (
        <>
          {renderGroup('A Fazer', tasks.filter(t => t.status === 'todo'))}
          {renderGroup('Em Progresso', tasks.filter(t => t.status === 'in_progress'))}
          {renderGroup('Concluído', tasks.filter(t => t.status === 'done'))}
        </>
      ) : groupBy === 'urgency' ? (
        <>
          {renderGroup('🔴 Alta', tasks.filter(t => t.urgency === 'high' || t.urgency === 'urgent'))}
          {renderGroup('🟠 Média', tasks.filter(t => t.urgency === 'medium'))}
          {renderGroup('🟢 Baixa', tasks.filter(t => t.urgency === 'low'))}
        </>
      ) : groupBy === 'recurrence' ? (
        <>
          {renderGroup('🔄 Recorrente Mensal (Microsoft Planner)', tasks.filter(t => t.recurrence === 'monthly'))}
          {renderGroup('📄 Tarefas Avulsas', tasks.filter(t => !t.recurrence || t.recurrence === 'single'))}
        </>
      ) : groupBy === 'month' ? (
        <>
          {Array.from(new Set(tasks.map(t => (t.dueDate ? t.dueDate.substring(0, 7) : 'sem-data'))))
            .sort()
            .map((my: string) => {
              const myTasks = tasks.filter(t => (t.dueDate ? t.dueDate.substring(0, 7) : 'sem-data') === my);
              const label = my === 'sem-data' ? 'Sem data definida' : formatMonthYearLabel(my);
              return renderGroup(label, myTasks);
            })}
        </>
      ) : (
        renderGroup('Todas as Tarefas', tasks)
      )}

    </div>
  );
};
