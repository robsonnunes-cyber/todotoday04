import React, { useState } from 'react';
import { 
  Plus, 
  Circle, 
  Clock, 
  CheckCircle2, 
  FolderPlus,
  Calendar,
  X,
  AlertCircle,
  Building2,
  Ticket
} from 'lucide-react';
import { Task, TaskStatus, TaskUrgency, Attachment, TaskRecurrence } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddTaskWithStatus: (status: TaskStatus) => void;
  onQuickCreateTask?: (taskData: Partial<Task>) => void;
  onAddAttachment?: (taskId: string, attachment: Attachment) => void;
  onRemoveAttachment?: (taskId: string, attachmentId: string) => void;
  onToggleRecurrence?: (taskId: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onToggleSubtask,
  onAddTaskWithStatus,
  onQuickCreateTask,
  onAddAttachment,
  onRemoveAttachment,
  onToggleRecurrence,
}) => {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  
  // State for inline Planner-style task creation per bucket
  const [activeInlineBucket, setActiveInlineBucket] = useState<TaskStatus | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineCompany, setInlineCompany] = useState('');
  const [inlineTicket, setInlineTicket] = useState('');
  const [inlineDueDate, setInlineDueDate] = useState('');
  const [inlineUrgency, setInlineUrgency] = useState<TaskUrgency>('urgent');
  const [inlineRecurrence, setInlineRecurrence] = useState<TaskRecurrence>('single');

  const columns: {
    id: TaskStatus;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    headerBorder: string;
  }[] = [
    {
      id: 'todo',
      title: 'A Fazer',
      icon: Circle,
      accentColor: 'text-slate-500 dark:text-slate-400',
      headerBorder: 'border-t-2 border-t-slate-400',
    },
    {
      id: 'in_progress',
      title: 'Em Andamento',
      icon: Clock,
      accentColor: 'text-amber-500 dark:text-amber-400',
      headerBorder: 'border-t-2 border-t-amber-500',
    },
    {
      id: 'done',
      title: 'Concluído',
      icon: CheckCircle2,
      accentColor: 'text-emerald-500 dark:text-emerald-400',
      headerBorder: 'border-t-2 border-t-emerald-500',
    },
  ];

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(taskId, newStatus);
    }
  };

  const handleStartInlineAdd = (status: TaskStatus) => {
    setActiveInlineBucket(status);
    setInlineTitle('');
    setInlineCompany('');
    setInlineTicket('');
    setInlineDueDate('');
    setInlineUrgency('medium');
  };

  const handleCancelInlineAdd = () => {
    setActiveInlineBucket(null);
    setInlineTitle('');
    setInlineCompany('');
    setInlineTicket('');
  };

  const handleSubmitInlineAdd = (status: TaskStatus, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineTitle.trim()) return;

    if (onQuickCreateTask) {
      onQuickCreateTask({
        title: inlineTitle.trim(),
        company: inlineCompany.trim(),
        ticket: inlineTicket.trim(),
        status,
        dueDate: inlineDueDate,
        urgency: inlineUrgency,
        recurrence: inlineRecurrence,
      });
    } else {
      onAddTaskWithStatus(status);
    }

    setInlineTitle('');
    setInlineCompany('');
    setInlineTicket('');
    setInlineDueDate('');
    setInlineRecurrence('single');
    // Keep inline add open for rapid task entry, like MS Planner!
  };

  const urgencyWeight: Record<TaskUrgency, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Side-by-side columns layout with smooth horizontal scroll for buckets */}
      <div className="flex flex-row overflow-x-auto gap-4 sm:gap-5 items-start pb-6 min-h-[calc(100vh-200px)]">
        {columns.map((column) => {
          // Classificar os cards (especialmente 'A Fazer') pela data de vencimento depois prioridade
          const columnTasks = tasks
            .filter((t) => t.status === column.id)
            .sort((a, b) => {
              // 1. Data de vencimento: mais próximas e vencidas primeiro; com data antes de sem data
              if (a.dueDate && !b.dueDate) return -1;
              if (!a.dueDate && b.dueDate) return 1;
              if (a.dueDate && b.dueDate) {
                const dateCmp = a.dueDate.localeCompare(b.dueDate);
                if (dateCmp !== 0) return dateCmp;
              }
              // 2. Prioridade / Urgência secundária: urgente > alta > média > baixa
              return (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
            });

          const ColumnIcon = column.icon;
          const isDraggingOver = dragOverColumn === column.id;
          const isInlineAdding = activeInlineBucket === column.id;

          return (
            <div
              key={column.id}
              id={`kanban-col-${column.id}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex-1 min-w-[280px] sm:min-w-[320px] max-w-md flex flex-col rounded-xl transition-all duration-150 bg-slate-100/75 dark:bg-slate-900/60 border ${
                isDraggingOver
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 shadow-md'
                  : 'border-slate-200/80 dark:border-slate-800/90 shadow-2xs'
              } p-2.5 sm:p-3 min-h-[560px]`}
            >
              {/* Microsoft Planner Bucket Header */}
              <div className="flex items-center justify-between gap-2 px-1 py-1 mb-2.5">
                <div className="flex items-center gap-2">
                  <ColumnIcon className={`w-3.5 h-3.5 ${column.accentColor}`} />
                  <h2 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    {column.title}
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  id={`btn-add-to-${column.id}`}
                  onClick={() => handleStartInlineAdd(column.id)}
                  title={`Adicionar tarefa em "${column.title}"`}
                  className="p-1 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Microsoft Planner Quick Inline Task Creator */}
              {isInlineAdding ? (
                <div className="mb-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 shadow-sm animate-in fade-in duration-150">
                  <form onSubmit={(e) => handleSubmitInlineAdd(column.id, e)} className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      placeholder="Insira um título de tarefa..."
                      className="w-full px-2 py-1.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <input
                          type="date"
                          value={inlineDueDate}
                          onChange={(e) => setInlineDueDate(e.target.value)}
                          className="w-full text-[11px] py-1 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
                        />
                      </div>

                      <select
                        value={inlineUrgency}
                        onChange={(e) => setInlineUrgency(e.target.value as TaskUrgency)}
                        className="text-[11px] py-1 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
                      >
                        <option value="urgent">Urgente</option>
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>

                      <select
                        value={inlineRecurrence}
                        onChange={(e) => setInlineRecurrence(e.target.value as TaskRecurrence)}
                        className="text-[11px] py-1 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
                        title="Tipo de Tarefa (Planner)"
                      >
                        <option value="single">Avulso</option>
                        <option value="monthly">Recorrente Mensal</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="submit"
                        disabled={!inlineTitle.trim()}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors"
                      >
                        Adicionar
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelInlineAdd}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartInlineAdd(column.id)}
                  className="mb-2.5 w-full flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                  <span>Adicionar tarefa</span>
                </button>
              )}

              {/* Tasks Cards List - Compact space-y-2 */}
              <div className="space-y-2 flex-1 flex flex-col">
                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onStatusChange={onStatusChange}
                      onToggleSubtask={onToggleSubtask}
                      onAddAttachment={onAddAttachment}
                      onRemoveAttachment={onRemoveAttachment}
                      onToggleRecurrence={onToggleRecurrence}
                    />
                  ))
                ) : !isInlineAdding ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center bg-white/40 dark:bg-slate-900/30">
                    <FolderPlus className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Nenhuma tarefa nesta lista
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

