import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  Paperclip, 
  ExternalLink, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Check, 
  AlertOctagon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Tag,
  Building2,
  Ticket,
  Repeat,
  FileText,
  Upload,
  Download,
  FileIcon,
  ImageIcon,
  X as CloseIcon
} from 'lucide-react';
import { Task, TaskStatus, TaskUrgency, Attachment } from '../types';
import { getTagStyle } from '../data/initialData';
import { getDueDateStatus } from '../utils/dateUtils';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddAttachment?: (taskId: string, attachment: Attachment) => void;
  onRemoveAttachment?: (taskId: string, attachmentId: string) => void;
  onToggleRecurrence?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
  onAddAttachment,
  onRemoveAttachment,
  onToggleRecurrence,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isDraggingOverCard, setIsDraggingOverCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRecurring = Boolean(task.recurrence && task.recurrence !== 'single');
  const recurrenceLabels: Record<string, string> = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };
  const recurrenceLabel = task.recurrence && task.recurrence !== 'single' 
    ? (recurrenceLabels[task.recurrence] || 'Recorrente') 
    : 'Avulsa';

  const getUrgencyConfig = (urgency: TaskUrgency) => {
    switch (urgency) {
      case 'urgent':
      case 'high':
        return {
          label: 'Alta',
          icon: AlertTriangle,
          className: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80',
          dotColor: 'bg-rose-500',
        };
      case 'medium':
        return {
          label: 'Média',
          icon: Clock,
          className: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80',
          dotColor: 'bg-amber-500',
        };
      case 'low':
      default:
        return {
          label: 'Baixa',
          icon: CheckCircle2,
          className: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80',
          dotColor: 'bg-emerald-500',
        };
    }
  };

  const urgencyConfig = getUrgencyConfig(task.urgency);
  const UrgencyIcon = urgencyConfig.icon;

  // Format and check due date status in Brazilian format (dd/mm/aaaa)
  const getDueDateInfo = () => {
    if (!task.dueDate) return null;
    const status = getDueDateStatus(task.dueDate, task.status === 'done');
    return {
      formatted: status.statusLabel,
      badgeClass: status.badgeClass,
    };
  };

  const dueDateInfo = getDueDateInfo();

  // Checklist counts
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === 'done') {
      onStatusChange(task.id, 'todo');
    } else {
      onStatusChange(task.id, 'done');
    }
  };

  // Direct file processing from file input or drag-and-drop
  const handleFiles = (files: FileList | File[]) => {
    if (!onAddAttachment) return;
    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: Attachment = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          title: file.name,
          fileName: file.name,
          url: dataUrl,
          dataUrl: dataUrl,
          size: sizeStr,
          type: isImg ? 'image' : 'file',
        };
        onAddAttachment(task.id, newAttachment);
        setShowAttachments(true);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOverCard(true);
    }
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverCard(false);
  };

  const handleCardDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOverCard(false);
      handleFiles(e.dataTransfer.files);
    }
  };

  const isDone = task.status === 'done';

  return (
    <div
      id={`task-card-${task.id}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleCardDragOver}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
      className={`group relative bg-white dark:bg-slate-900/95 rounded-lg p-2.5 sm:p-3 border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-sm ${
        isDraggingOverCard
          ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
          : isDone 
            ? 'border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 opacity-80' 
            : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
      }`}
      onClick={() => onEdit(task)}
    >
      {/* Hidden File Input for Direct Card Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />

      {/* Visual File Drag Overlay */}
      {isDraggingOverCard && (
        <div className="absolute inset-0 bg-emerald-600/10 dark:bg-emerald-500/20 rounded-lg border-2 border-dashed border-emerald-500 flex flex-col items-center justify-center z-20 pointer-events-none">
          <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-bounce mb-1" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            Solte os arquivos para anexar
          </span>
        </div>
      )}

      {/* Top Badges Row: Urgência, Recorrência (Avulso / Recorrente Mensal), Tags */}
      <div className="flex flex-wrap items-center gap-1 mb-1.5">
        {/* Urgency indicator */}
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border ${urgencyConfig.className}`}>
          <UrgencyIcon className="w-2.5 h-2.5 shrink-0" />
          <span>{urgencyConfig.label}</span>
        </span>

        {/* Recurrence Badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleRecurrence) onToggleRecurrence(task.id);
          }}
          title={isRecurring ? `Tarefa Recorrente (${recurrenceLabel}) - Clique para alternar` : 'Tarefa Avulsa - Clique para tornar recorrente'}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-semibold rounded border transition-colors ${
            isRecurring
              ? 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
              : 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          {isRecurring ? (
            <>
              <Repeat className="w-2.5 h-2.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>{recurrenceLabel}</span>
            </>
          ) : (
            <>
              <FileText className="w-2.5 h-2.5 shrink-0 text-slate-400" />
              <span>Avulsa</span>
            </>
          )}
        </button>

        {/* Compact Tags */}
        {task.tags && task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className={`text-[9.5px] font-medium px-1.5 py-0.2 rounded border leading-tight ${getTagStyle(tag)}`}
          >
            {tag}
          </span>
        ))}
        {task.tags && task.tags.length > 2 && (
          <span className="text-[9.5px] text-slate-400 font-medium px-0.5">
            +{task.tags.length - 2}
          </span>
        )}
      </div>

      {/* Main Row: Microsoft Planner Circular Checkbox + Title + More Menu */}
      <div className="flex items-start gap-2">
        
        {/* Planner Circle Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          title={isDone ? 'Marcar como não concluída' : 'Concluir tarefa'}
          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
            isDone
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-transparent hover:text-emerald-600'
          }`}
        >
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </button>

        {/* Title & Company */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-xs sm:text-[13px] font-medium leading-snug text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
            isDone ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : ''
          }`}>
            {task.title}
          </h3>

          {/* Company (Empresa abaixo do título) */}
          {task.company && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <Building2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />
              <span className="truncate">{task.company}</span>
            </div>
          )}
        </div>

        {/* Compact Actions: Direct Delete Button + More Actions Menu */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick upload trigger button on card */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 opacity-0 group-hover:opacity-100 transition-all"
            title="Anexar arquivo diretamente no card"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Direct Delete Button on Card */}
          <button
            id={`btn-delete-${task.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 opacity-0 group-hover:opacity-100 transition-all"
            title="Excluir tarefa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* More options menu */}
          <button
            id={`btn-menu-${task.id}`}
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Mais opções"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              ></div>
              <div className="absolute right-0 top-5 z-30 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 text-xs text-slate-700 dark:text-slate-200">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(task);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Edit3 className="w-3 h-3 text-blue-500" />
                  <span>Editar Tarefa</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Upload className="w-3 h-3 text-emerald-500" />
                  <span>Anexar Arquivo</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (onToggleRecurrence) onToggleRecurrence(task.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Repeat className="w-3 h-3 text-indigo-500" />
                  <span>{isRecurring ? 'Definir como Avulsa' : 'Tornar Recorrente (Mensal)'}</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                
                <div className="px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Mover Para
                </div>
                
                {task.status !== 'todo' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onStatusChange(task.id, 'todo');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>A Fazer</span>
                  </button>
                )}

                {task.status !== 'in_progress' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onStatusChange(task.id, 'in_progress');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Em Andamento</span>
                  </button>
                )}

                {task.status !== 'done' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onStatusChange(task.id, 'done');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Concluído</span>
                  </button>
                )}

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(task.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Excluir</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Description Snippet */}
      {task.description && !isDone && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 pl-6">
          {task.description}
        </p>
      )}

      {/* Chamado text badge (Abaixo da Descrição) */}
      {task.ticket && !isDone && (
        <div className="mt-1 pl-6">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/80">
            <Ticket className="w-2.5 h-2.5 text-blue-500 shrink-0" />
            <span>Chamado: {task.ticket}</span>
          </span>
        </div>
      )}

      {/* Subtasks with Scrollbar to View ALL Subtasks (Barra de rolagem personalizada) */}
      {totalSubtasks > 0 && !isDone && (
        <div className="mt-2 pl-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-2.5 h-2.5 text-blue-500" />
              Subtarefas ({completedSubtasks}/{totalSubtasks})
            </span>
            {totalSubtasks > 2 && (
              <span className="text-[9px] text-slate-400 font-normal">
                role para ver todas
              </span>
            )}
          </div>
          
          <div className="max-h-24 sm:max-h-28 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-400">
            {task.subtasks.map((sub) => (
              <label
                key={sub.id}
                className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => onToggleSubtask && onToggleSubtask(task.id, sub.id)}
                  className="mt-0.5 rounded-xs border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer shrink-0"
                />
                <span className={`break-words leading-tight ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                  {sub.title}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Zone and Attachments List inside Card */}
      {showAttachments && (
        <div className="mt-2 pl-6 pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
          {/* Quick upload dropzone inside card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 mb-1.5 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 text-center cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-600 dark:text-slate-300 font-medium">
              <Upload className="w-3 h-3 text-emerald-600" />
              <span>Clique ou arraste para anexar arquivo</span>
            </div>
          </div>

          {/* Attachments List */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {task.attachments.map((att) => {
                const isImg = att.type === 'image' || att.url?.startsWith('data:image');
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-1.5 p-1 rounded bg-slate-100/80 dark:bg-slate-800/80 text-[10.5px]"
                  >
                    <a
                      href={att.url || att.dataUrl}
                      download={att.fileName || att.title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 min-w-0 text-blue-600 dark:text-blue-400 hover:underline"
                      title={att.title}
                    >
                      {isImg ? (
                        <ImageIcon className="w-3 h-3 shrink-0 text-purple-500" />
                      ) : (
                        <FileIcon className="w-3 h-3 shrink-0 text-blue-500" />
                      )}
                      <span className="truncate max-w-[140px]">{att.fileName || att.title}</span>
                      {att.size && (
                        <span className="text-[9px] text-slate-400 font-normal shrink-0">({att.size})</span>
                      )}
                    </a>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.url || att.dataUrl}
                        download={att.fileName || att.title}
                        className="p-0.5 text-slate-400 hover:text-blue-600"
                        title="Baixar arquivo"
                      >
                        <Download className="w-2.5 h-2.5" />
                      </a>
                      {onRemoveAttachment && (
                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(task.id, att.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-500"
                          title="Remover anexo"
                        >
                          <CloseIcon className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Card Footer: Indicators (Due Date, Checklist count, Attachments + Direct Upload Button, Assignees) */}
      <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* Left indicators cluster */}
        <div className="flex items-center flex-wrap gap-1.5 text-[10.5px]">
          
          {/* Due date pill */}
          {dueDateInfo && (
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] ${dueDateInfo.badgeClass}`}>
              <Calendar className="w-2.5 h-2.5 shrink-0" />
              <span>{dueDateInfo.formatted}</span>
            </div>
          )}

          {/* Checklist fraction badge */}
          {totalSubtasks > 0 && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.2 rounded ${
              completedSubtasks === totalSubtasks 
                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50' 
                : 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              <CheckSquare className="w-2.5 h-2.5" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </span>
          )}

          {/* Attachments counter badge */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAttachments(!showAttachments);
            }}
            className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded transition-colors ${
              showAttachments 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                : 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 hover:text-blue-600'
            }`}
            title="Ver / anexar arquivos neste card"
          >
            <Paperclip className="w-2.5 h-2.5" />
            <span>{task.attachments?.length || 0}</span>
          </button>

          {/* Quick upload icon on footer */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
            title="Anexar arquivo"
          >
            <Upload className="w-2.5 h-2.5" />
            <span>+Anexo</span>
          </button>

        </div>

        {/* Right side: Compact Assignees Avatars Cluster */}
        <div className="flex items-center -space-x-1.5 shrink-0 overflow-hidden">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.slice(0, 3).map((user) => (
              <div
                key={user.id}
                title={user.email ? `${user.name} (${user.role}) • ${user.email}` : `${user.name} (${user.role})`}
                className="w-5.5 h-5.5 rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden shrink-0 shadow-2xs"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold ${user.color || 'bg-blue-600 text-white'}`}>
                    {user.initials}
                  </div>
                )}
              </div>
            ))
          ) : null}
          {task.assignees && task.assignees.length > 3 && (
            <div 
              title={`${task.assignees.slice(3).map(a => a.name).join(', ')}`}
              className="w-5.5 h-5.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[8.5px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-2xs"
            >
              +{task.assignees.length - 3}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

