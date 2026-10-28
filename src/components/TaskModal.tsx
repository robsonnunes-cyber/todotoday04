import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag as TagIcon, 
  Paperclip, 
  CheckSquare, 
  User, 
  AlertCircle, 
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  Circle,
  ExternalLink,
  Building2,
  Ticket,
  Users,
  Search,
  Check,
  Mail,
  Repeat,
  FileText,
  Upload,
  Download,
  FileIcon,
  ImageIcon,
  Sparkles
} from 'lucide-react';
import { Task, TaskStatus, TaskUrgency, Assignee, Attachment, Subtask, TaskRecurrence } from '../types';
import { PREDEFINED_TAGS, getTagStyle } from '../data/initialData';
import { normalizeToISODate, formatBRDateWithWeekday, formatToBRDate } from '../utils/dateUtils';
import { SupabaseService } from '../services/supabaseService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: Task | null;
  defaultStatus?: TaskStatus;
  defaultDate?: string;
  assignees: Assignee[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  defaultStatus = 'todo',
  defaultDate = '',
  assignees,
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [ticket, setTicket] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [urgency, setUrgency] = useState<TaskUrgency>('medium');
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [showAttForm, setShowAttForm] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setCompany(initialTask.company || '');
      setDescription(initialTask.description || '');
      setTicket(initialTask.ticket || '');
      setStatus(initialTask.status || 'todo');
      setUrgency(initialTask.urgency === 'urgent' ? 'high' : (initialTask.urgency || 'medium'));
      setRecurrence(initialTask.recurrence || 'single');
      setSelectedAssignees(initialTask.assignees || []);
      setDueDate(normalizeToISODate(initialTask.dueDate));
      setTags(initialTask.tags || []);
      setAttachments(initialTask.attachments || []);
      setSubtasks(initialTask.subtasks || []);
    } else {
      setTitle('');
      setCompany('');
      setDescription('');
      setTicket('');
      setStatus(defaultStatus);
      setUrgency('medium');
      setRecurrence('single');
      setSelectedAssignees([]);
      setDueDate(normalizeToISODate(defaultDate) || normalizeToISODate(new Date()));
      setTags([]);
      setAttachments([]);
      setSubtasks([]);
    }
    setAssigneeSearch('');
  }, [initialTask, defaultStatus, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleToggleAssignee = (member: Assignee) => {
    if (selectedAssignees.some(a => a.id === member.id)) {
      setSelectedAssignees(selectedAssignees.filter(a => a.id !== member.id));
    } else {
      setSelectedAssignees([...selectedAssignees, member]);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        const result = await SupabaseService.uploadAttachment(file);
        if (result.attachment) {
          setAttachments(prev => [...prev, result.attachment!]);
        }
      }
    } catch (err) {
      console.warn('Falha no upload para Supabase Storage:', err);
    } finally {
      setIsUploadingAttachment(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddAttachment = () => {
    if (!newAttUrl.trim()) return;
    let url = newAttUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const newAtt: Attachment = {
      id: 'att-' + Date.now(),
      title: newAttTitle.trim() || url,
      url: url,
      type: 'link',
    };
    setAttachments([...attachments, newAtt]);
    setNewAttTitle('');
    setNewAttUrl('');
    setShowAttForm(false);
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(attachments.filter(a => a.id !== attId));
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: 'sub-' + Date.now(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    setSubtasks(subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s));
  };

  const handleRemoveSubtask = (subId: string) => {
    setSubtasks(subtasks.filter(s => s.id !== subId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(initialTask ? { id: initialTask.id, createdAt: initialTask.createdAt, order: initialTask.order } : {}),
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      ticket: ticket.trim(),
      status,
      urgency,
      recurrence,
      assignees: selectedAssignees,
      dueDate,
      tags,
      attachments,
      subtasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const urgencies: { value: TaskUrgency; label: string; border: string; bg: string; dot: string }[] = [
    { value: 'low', label: 'Baixa', border: 'border-emerald-300 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    { value: 'medium', label: 'Média', border: 'border-amber-300 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    { value: 'high', label: 'Alta', border: 'border-rose-300 dark:border-rose-800', bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300', dot: 'bg-rose-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}
            </span>
            {initialTask && (
              <span className="text-xs text-slate-400 font-mono">#{initialTask.id}</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Título da Tarefa <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-task-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conciliar fechamento de contas a pagar"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Company Input (Abaixo do Título) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Empresa</span>
            </label>
            <input
              id="input-task-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Soma CSC, Acme Corporation, etc."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status & Urgency in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Status Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Coluna / Status
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatus('todo')}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    status === 'todo' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Circle className="w-3 h-3 text-slate-400" />
                  <span>A Fazer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('in_progress')}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    status === 'in_progress' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Progresso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('done')}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    status === 'done' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Concluído</span>
                </button>
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Nível de Urgência
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {urgencies.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgency(u.value)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-xl border flex flex-col items-center gap-0.5 transition-all ${
                      urgency === u.value
                        ? `${u.bg} ${u.border} ring-2 ring-blue-500/20`
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${u.dot}`}></span>
                    <span>{u.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Tipo de Agendamento (Recorrência) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tipo de Tarefa (Recorrência)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {recurrence === 'single' && 'Ocorrência única'}
                {recurrence === 'daily' && 'Repete todo dia útil'}
                {recurrence === 'weekly' && 'Repete toda semana'}
                {recurrence === 'monthly' && 'Repete todo mês'}
                {recurrence === 'yearly' && 'Repete anualmente'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { value: 'single', label: 'Avulsa', icon: FileText },
                { value: 'daily', label: 'Diária', icon: Repeat },
                { value: 'weekly', label: 'Semanal', icon: Repeat },
                { value: 'monthly', label: 'Mensal', icon: Repeat },
                { value: 'yearly', label: 'Anual', icon: Repeat },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecurrence(opt.value as TaskRecurrence)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    recurrence === opt.value
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <opt.icon className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            {recurrence !== 'single' && (
              <p className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Ao concluir esta tarefa, o próximo ciclo será gerado automaticamente para a próxima data com o checklist renovado!
                </span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Descrição Detalhada
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os objetivos, especificações ou critérios de aceite da tarefa..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-y"
            ></textarea>
          </div>

          {/* Chamado Text Field (Abaixo da Descrição) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-blue-500" />
              <span>Chamado</span>
            </label>
            <input
              id="input-task-ticket"
              type="text"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="Ex: #CHAM-1042, TICKET-9821, INC-403"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Assignees & Due Date */}
          <div className="space-y-4">
            
            {/* Assignees Multi-select Section */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Responsáveis da Equipe ({selectedAssignees.length})
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  {assignees.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedAssignees([...assignees])}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Selecionar Todos
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedAssignees([])}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                      >
                        Limpar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Selected Assignees quick pills */}
              {selectedAssignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                  {selectedAssignees.map((member) => (
                    <span
                      key={member.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100 text-xs font-medium border border-blue-200 dark:border-blue-700 shadow-2xs"
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${member.color || 'bg-blue-600 text-white'}`}>
                          {member.initials}
                        </span>
                      )}
                      <span>{member.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAssignee(member)}
                        className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 transition-colors"
                        title="Remover responsável"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search input for members if > 3 */}
              {assignees.length > 3 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    placeholder="Buscar por nome, cargo ou e-mail..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Members List with Checkboxes and Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {assignees
                  .filter((m) =>
                    !assigneeSearch ||
                    m.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                    (m.email && m.email.toLowerCase().includes(assigneeSearch.toLowerCase())) ||
                    (m.role && m.role.toLowerCase().includes(assigneeSearch.toLowerCase()))
                  )
                  .map((member) => {
                    const isSelected = selectedAssignees.some(a => a.id === member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => handleToggleAssignee(member)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 text-slate-900 dark:text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                          ) : (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${member.color || 'bg-blue-600 text-white'} ring-1 ring-slate-200 dark:ring-slate-700`}>
                              {member.initials}
                            </div>
                          )}
                        </div>

                        {/* Member Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {member.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {member.role && <span className="truncate">{member.role}</span>}
                            {member.email && (
                              <>
                                <span>•</span>
                                <span className="truncate" title={member.email}>{member.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {assignees.length === 0 && (
                  <div className="col-span-full py-4 text-center text-xs text-slate-400">
                    Nenhum integrante cadastrado. Clique em "Gerenciar Equipe" para adicionar colaboradores.
                  </div>
                )}
              </div>
            </div>

            {/* Due Date Picker with Brazilian Format Indicator */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Data de Entrega / Prazo</span>
                </label>
                {dueDate && (
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    Formato BR: {formatBRDateWithWeekday(dueDate) || formatToBRDate(dueDate)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  id="input-task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Quick Date Helper Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDueDate(normalizeToISODate(new Date()))}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setDueDate(normalizeToISODate(d));
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setDueDate(normalizeToISODate(d));
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    +7 Dias
                  </button>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-medium transition-colors"
                    >
                      Remover Prazo
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tags Personalizadas
            </label>
            
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Digite uma tag e pressione Enter..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                + Adicionar
              </button>
            </div>

            {/* Active Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${getTagStyle(tag)}`}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick suggested tag pills */}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[11px] text-slate-400 mr-1">Sugeridas:</span>
              {PREDEFINED_TAGS.slice(0, 6).map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => handleAddTag(suggested)}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  +{suggested}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks / Checklist Manager */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Checklist de Subtarefas ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </label>
            </div>

            {/* Subtasks List */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                  >
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(sub.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className={`text-xs text-slate-700 dark:text-slate-200 ${sub.completed ? 'line-through text-slate-400' : ''}`}>
                        {sub.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(sub.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Adicionar item à checklist..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-100"
              >
                + Item
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Anexos & Arquivos ({attachments.length})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload de Arquivo</span>
                </button>
                {!showAttForm && (
                  <button
                    type="button"
                    onClick={() => setShowAttForm(true)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link</span>
                  </button>
                )}
              </div>
            </div>

            {/* Attachments List */}
            {isUploadingAttachment && (
              <div className="flex items-center gap-2 p-2.5 mb-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Enviando anexo para o Supabase Storage...</span>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.title}
                      className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                    >
                      {att.type === 'image' ? (
                        <ImageIcon className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <FileIcon className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                      )}
                      <span className="truncate">{att.title || att.url}</span>
                      {att.size && (
                        <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                      )}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Attachment Form Drawer */}
            {showAttForm && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <input
                  type="text"
                  value={newAttTitle}
                  onChange={(e) => setNewAttTitle(e.target.value)}
                  placeholder="Nome do anexo (ex: Planilha de Requisitos / Figma)"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <input
                  type="url"
                  value={newAttUrl}
                  onChange={(e) => setNewAttUrl(e.target.value)}
                  placeholder="URL do Link (https://...)"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAttForm(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                  >
                    Salvar Anexo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {initialTask && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialTask.id)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Tarefa</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                id="btn-save-task"
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                {initialTask ? 'Salvar Alterações' : 'Criar Tarefa'}
              </button>
            </div>
          </div>

        </form>

      </div>

    </div>
  );
};
