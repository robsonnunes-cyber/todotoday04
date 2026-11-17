/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Task, 
  TaskStatus, 
  TaskUrgency, 
  TaskRecurrence,
  ViewMode, 
  FilterState, 
  ToastMessage,
  Assignee,
  AuthUser
} from './types';
import { INITIAL_TASKS, INITIAL_ASSIGNEES, PREDEFINED_TAGS } from './data/initialData';
import { checkAndNotifyUrgentTasks, playNotificationSound } from './services/notificationService';
import { calculateNextDueDate, formatToBRDate, normalizeToISODate } from './utils/dateUtils';

// Subcomponents
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { KanbanView } from './components/KanbanView';
import { ListView } from './components/ListView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { TaskModal } from './components/TaskModal';
import { NotificationModal } from './components/NotificationModal';
import { SpreadsheetImportModal } from './components/SpreadsheetImportModal';
import { ToastContainer } from './components/ToastContainer';
import { AuthView } from './components/AuthView';
import { SupabaseService } from './services/supabaseService';

const STORAGE_KEY_TASKS = 'planner_pro_tasks_backup';
const STORAGE_KEY_THEME = 'planner_pro_dark_mode';
const STORAGE_KEY_MEMBERS = 'planner_pro_team_members';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Supabase Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const { user } = SupabaseService.getStoredAuth();
    return user;
  });
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  // Validate existing auth session on mount
  useEffect(() => {
    const { token } = SupabaseService.getStoredAuth();
    if (token) {
      SupabaseService.getCurrentUser(token)
        .then((res) => {
          if (res.user) {
            setCurrentUser(res.user);
          } else {
            SupabaseService.clearStoredAuth();
            setCurrentUser(null);
          }
        })
        .catch(() => {
          // If offline, keep local user
        })
        .finally(() => {
          setIsVerifyingAuth(false);
        });
    } else {
      setIsVerifyingAuth(false);
    }
  }, []);

  const normalizeTaskStatus = useCallback((rawStatus: unknown): TaskStatus => {
    const normalized = String(rawStatus ?? 'todo').trim().toLowerCase();
    if (
      normalized === 'done' ||
      normalized === 'completed' ||
      normalized === 'concluido' ||
      normalized === 'concluído' ||
      normalized === 'finalizado'
    ) {
      return 'done';
    }
    if (
      normalized === 'in_progress' ||
      normalized === 'in-progress' ||
      normalized === 'em_andamento' ||
      normalized === 'em andamento' ||
      normalized === 'progresso'
    ) {
      return 'in_progress';
    }
    return 'todo';
  }, []);

  // Main tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: Task) => ({
            ...t,
            status:
              String(t.status ?? 'todo').trim().toLowerCase() === 'done'
                ? 'done'
                : String(t.status ?? 'todo').trim().toLowerCase() === 'in_progress'
                  ? 'in_progress'
                  : 'todo',
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load backup tasks', e);
    }
    return INITIAL_TASKS;
  });

  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  // Tracks task IDs with in-flight or very recent optimistic updates so background polling doesn't overwrite them with stale data
  const pendingTaskSyncRef = useRef<Map<string, number>>(new Map());

  // Dynamic team members state with LocalStorage persistence and Sheets sync
  const [assignees, setAssignees] = useState<Assignee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load backup team members', e);
    }
    return INITIAL_ASSIGNEES;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statuses: [],
    urgencies: [],
    assigneeIds: [],
    tags: [],
    companies: [],
    ticketSearch: '',
    dateFilter: 'all',
    dateFilters: [],
    customStartDate: '',
    customEndDate: '',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [defaultDate, setDefaultDate] = useState<string>('');

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], title: string, description?: string) => {
    const newToast: ToastMessage = {
      id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      type,
      title,
      description,
    };
    setToasts(prev => [...prev.slice(-3), newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLogout = useCallback(async () => {
    await SupabaseService.logout();
    setCurrentUser(null);
    addToast('info', 'Sessão Encerrada', 'Você saiu da área de atividades da equipe.');
  }, [addToast]);

  // Synchronize dark mode class with HTML root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, String(darkMode));
  }, [darkMode]);

  // Save backup to LocalStorage for safety
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Failed to save local tasks backup', e);
    }
  }, [tasks]);

  // Save team members to LocalStorage for safety
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(assignees));
    } catch (e) {
      console.warn('Failed to save team members backup', e);
    }
  }, [assignees]);

  // Automatic synchronization with Supabase Database (active only when authenticated)
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [tasksRes, teamRes] = await Promise.all([
          SupabaseService.fetchTasks(),
          SupabaseService.fetchTeamMembers()
        ]);

        if (!isMounted) return;

        // If tasks exist in Supabase, load them; otherwise auto-seed
        if (tasksRes.tasks && tasksRes.tasks.length > 0) {
          const now = Date.now();
          setTasks(prev => {
            return tasksRes.tasks.map(rem => {
              const local = prev.find(p => p.id === rem.id);
              const pendingUntil = pendingTaskSyncRef.current.get(rem.id);
              if (local && pendingUntil && pendingUntil > now) {
                return local;
              }
              return {
                ...rem,
                status: normalizeTaskStatus(rem.status),
                recurrence: (rem.recurrence && rem.recurrence !== 'single') ? rem.recurrence : (local?.recurrence || rem.recurrence || 'single')
              };
            });
          });
        } else {
          await SupabaseService.syncAllTasks(INITIAL_TASKS);
        }

        // If team members exist in Supabase, load them; otherwise auto-seed
        let membersList = teamRes.members && teamRes.members.length > 0 ? teamRes.members : INITIAL_ASSIGNEES;
        if (currentUser) {
          const alreadyExists = membersList.some(
            m => m.id === currentUser.id || (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase())
          );
          if (!alreadyExists) {
            const authAssignee: Assignee = {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              avatarUrl: currentUser.avatar || '',
              color: currentUser.color || 'bg-emerald-600 text-white',
              initials: currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            };
            membersList = [authAssignee, ...membersList];
            SupabaseService.saveTeamMember(authAssignee).catch(console.warn);
          }
        }
        setAssignees(membersList);
      } catch (e) {
        console.warn('Initial automatic Supabase sync note:', e);
      }
    };

    loadInitialData();

    // Background automatic poll every 15s to keep all clients/tabs up to date
    const syncInterval = setInterval(async () => {
      try {
        const [tasksRes, teamRes] = await Promise.all([
          SupabaseService.fetchTasks(),
          SupabaseService.fetchTeamMembers()
        ]);

        if (!isMounted) return;

        if (tasksRes.tasks && tasksRes.tasks.length > 0) {
          const now = Date.now();
          setTasks(prev => {
            const merged = tasksRes.tasks.map(rem => {
              const local = prev.find(p => p.id === rem.id);
              const pendingUntil = pendingTaskSyncRef.current.get(rem.id);
              if (local && pendingUntil && pendingUntil > now) {
                return local;
              }
              return {
                ...rem,
                status: normalizeTaskStatus(rem.status),
                recurrence: (rem.recurrence && rem.recurrence !== 'single') ? rem.recurrence : (local?.recurrence || rem.recurrence || 'single')
              };
            });
            const prevStr = JSON.stringify(prev.map(t => ({ id: t.id, status: t.status, recurrence: t.recurrence, source: t.source, resolutionNote: t.resolutionNote, completedBy: t.completedBy, updatedAt: t.updatedAt })));
            const nextStr = JSON.stringify(merged.map(t => ({ id: t.id, status: t.status, recurrence: t.recurrence, source: t.source, resolutionNote: t.resolutionNote, completedBy: t.completedBy, updatedAt: t.updatedAt })));
            return prevStr === nextStr ? prev : merged;
          });
        }

        if (teamRes.members && teamRes.members.length > 0) {
          setAssignees(prev => {
            const prevStr = JSON.stringify(prev.map(m => ({ id: m.id, name: m.name })));
            const nextStr = JSON.stringify(teamRes.members.map(m => ({ id: m.id, name: m.name })));
            return prevStr !== nextStr ? teamRes.members : prev;
          });
        }
      } catch (e) {
        // Silent background check
      }
    }, 15000);

    // Refresh automatically when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        SupabaseService.fetchTasks().then(res => {
          if (isMounted && res.tasks && res.tasks.length > 0) {
            const now = Date.now();
            setTasks(prev => {
              return res.tasks.map(rem => {
                const local = prev.find(p => p.id === rem.id);
                const pendingUntil = pendingTaskSyncRef.current.get(rem.id);
                if (local && pendingUntil && pendingUntil > now) {
                  return local;
                }
                return {
                  ...rem,
                  status: normalizeTaskStatus(rem.status),
                  recurrence: (rem.recurrence && rem.recurrence !== 'single') ? rem.recurrence : (local?.recurrence || rem.recurrence || 'single')
                };
              });
            });
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  // Auto-check notifications on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAndNotifyUrgentTasks(tasks);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Available tags derived dynamically
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>(PREDEFINED_TAGS);
    tasks.forEach(t => {
      t.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [tasks]);

  // Available companies derived dynamically from tasks
  const availableCompanies = useMemo(() => {
    const companySet = new Set<string>();
    tasks.forEach(t => {
      if (t.company && t.company.trim()) {
        companySet.add(t.company.trim());
      }
    });
    return Array.from(companySet);
  }, [tasks]);

  // Available tickets derived dynamically from tasks
  const availableTickets = useMemo(() => {
    const ticketSet = new Set<string>();
    tasks.forEach(t => {
      if (t.ticket && t.ticket.trim()) {
        ticketSet.add(t.ticket.trim());
      }
    });
    return Array.from(ticketSet);
  }, [tasks]);

  // Dynamic counts for active filters
  const companyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.company && t.company.trim()) {
        const comp = t.company.trim();
        counts[comp] = (counts[comp] || 0) + 1;
      }
    });
    return counts;
  }, [tasks]);

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
    tasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [tasks]);

  const urgencyCounts = useMemo(() => {
    const counts: Record<TaskUrgency, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach(t => {
      const effectiveUrgency = t.urgency === 'urgent' ? 'high' : t.urgency;
      if (counts[effectiveUrgency] !== undefined) {
        counts[effectiveUrgency]++;
      }
    });
    return counts;
  }, [tasks]);

  // Dynamic counts for date options (vencidos, hoje, esta semana, etc.)
  const dateCounts = useMemo(() => {
    const now = new Date();
    const todayStr = normalizeToISODate(now);
    const currentYearMonth = todayStr.substring(0, 7);

    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mondayDate = new Date(now);
    mondayDate.setDate(diffToMonday);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const thisWeekStart = normalizeToISODate(mondayDate);
    const thisWeekEnd = normalizeToISODate(sundayDate);

    const nextMondayDate = new Date(mondayDate);
    nextMondayDate.setDate(mondayDate.getDate() + 7);
    const nextSundayDate = new Date(nextMondayDate);
    nextSundayDate.setDate(nextMondayDate.getDate() + 6);
    const nextWeekStart = normalizeToISODate(nextMondayDate);
    const nextWeekEnd = normalizeToISODate(nextSundayDate);

    let overdue = 0;
    let today = 0;
    let thisWeek = 0;
    let nextWeek = 0;
    let thisMonth = 0;
    let noDate = 0;

    tasks.forEach(t => {
      const isDone = t.status === 'done';
      if (!isDone && t.dueDate && t.dueDate < todayStr) {
        overdue++;
      }
      if (t.dueDate === todayStr) {
        today++;
      }
      if (t.dueDate && t.dueDate >= thisWeekStart && t.dueDate <= thisWeekEnd) {
        thisWeek++;
      }
      if (t.dueDate && t.dueDate >= nextWeekStart && t.dueDate <= nextWeekEnd) {
        nextWeek++;
      }
      if (t.dueDate && t.dueDate.startsWith(currentYearMonth)) {
        thisMonth++;
      }
      if (!t.dueDate) {
        noDate++;
      }
    });

    return { overdue, today, thisWeek, nextWeek, thisMonth, noDate };
  }, [tasks]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = normalizeToISODate(now);
    const currentYearMonth = todayStr.substring(0, 7);
    
    // Week calculation (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mondayDate = new Date(now);
    mondayDate.setDate(diffToMonday);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const thisWeekStart = normalizeToISODate(mondayDate);
    const thisWeekEnd = normalizeToISODate(sundayDate);

    // Next week calculation
    const nextMondayDate = new Date(mondayDate);
    nextMondayDate.setDate(mondayDate.getDate() + 7);
    const nextSundayDate = new Date(nextMondayDate);
    nextSundayDate.setDate(nextMondayDate.getDate() + 6);
    const nextWeekStart = normalizeToISODate(nextMondayDate);
    const nextWeekEnd = normalizeToISODate(nextSundayDate);

    return tasks.filter(task => {
      // Search filter
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchCompany = task.company?.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchTicket = task.ticket?.toLowerCase().includes(query);
        const matchTag = task.tags?.some(t => t.toLowerCase().includes(query));
        const matchAssignee = task.assignees?.some(a => a.name.toLowerCase().includes(query));
        if (!matchTitle && !matchCompany && !matchDesc && !matchTicket && !matchTag && !matchAssignee) {
          return false;
        }
      }

      // Ticket filter (Chamado específico)
      if (filters.ticketSearch.trim()) {
        const queryTicket = filters.ticketSearch.toLowerCase().trim();
        if (!task.ticket || !task.ticket.toLowerCase().includes(queryTicket)) {
          return false;
        }
      }

      // Company filter (Empresas selecionadas)
      if (filters.companies.length > 0) {
        if (!task.company || !filters.companies.includes(task.company.trim())) {
          return false;
        }
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
        return false;
      }

      // Priority / Urgency filter (Alta, Média, Baixa)
      if (filters.urgencies.length > 0) {
        const effectiveUrgency = task.urgency === 'urgent' ? 'high' : task.urgency;
        const matches = filters.urgencies.includes(effectiveUrgency) || filters.urgencies.includes(task.urgency);
        if (!matches) {
          return false;
        }
      }

      // Assignee filter
      if (filters.assigneeIds.length > 0) {
        const hasMatch = task.assignees?.some(a => filters.assigneeIds.includes(a.id));
        if (!hasMatch) return false;
      }

      // Tag filter
      if (filters.tags.length > 0) {
        const hasTag = task.tags?.some(t => filters.tags.includes(t));
        if (!hasTag) return false;
      }

      // Date / Period Filter supporting multi-selection
      const activeDateFilters = (filters.dateFilters && filters.dateFilters.length > 0)
        ? filters.dateFilters.filter(f => f !== 'all')
        : (filters.dateFilter && filters.dateFilter !== 'all' ? [filters.dateFilter] : []);

      if (activeDateFilters.length > 0) {
        const matchesAnyDate = activeDateFilters.some(df => {
          if (df === 'overdue') {
            return task.status !== 'done' && Boolean(task.dueDate) && task.dueDate < todayStr;
          }
          if (df === 'today') {
            return task.dueDate === todayStr;
          }
          if (df === 'this_week') {
            return Boolean(task.dueDate) && task.dueDate >= thisWeekStart && task.dueDate <= thisWeekEnd;
          }
          if (df === 'this_month') {
            return Boolean(task.dueDate) && task.dueDate.startsWith(currentYearMonth);
          }
          if (df === 'next_week') {
            return Boolean(task.dueDate) && task.dueDate >= nextWeekStart && task.dueDate <= nextWeekEnd;
          }
          if (df === 'no_date') {
            return !task.dueDate;
          }
          if (df === 'custom') {
            if (filters.customStartDate && (!task.dueDate || task.dueDate < filters.customStartDate)) return false;
            if (filters.customEndDate && (!task.dueDate || task.dueDate > filters.customEndDate)) return false;
            return true;
          }
          return false;
        });

        if (!matchesAnyDate) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      const priorityRank: Record<TaskUrgency, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

      if (filters.sortBy === 'dueDate') {
        // 1. Data de vencimento: com data antes de sem data
        if (a.dueDate && !b.dueDate) return -1 * order;
        if (!a.dueDate && b.dueDate) return 1 * order;
        if (a.dueDate && b.dueDate) {
          const dateCmp = a.dueDate.localeCompare(b.dueDate) * order;
          if (dateCmp !== 0) return dateCmp;
        }
        // 2. Prioridade / Urgência secundária: urgente primeiro
        return ((priorityRank[b.urgency] || 0) - (priorityRank[a.urgency] || 0)) * order;
      }
      if (filters.sortBy === 'urgency') {
        const urgCmp = ((priorityRank[b.urgency] || 0) - (priorityRank[a.urgency] || 0)) * order;
        if (urgCmp !== 0) return urgCmp;
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return 0;
      }
      if (filters.sortBy === 'title') {
        return a.title.localeCompare(b.title) * order;
      }
      if (filters.sortBy === 'createdAt') {
        return a.createdAt.localeCompare(b.createdAt) * order;
      }
      return 0;
    });
  }, [tasks, filters]);

  // Urgent and today tasks count for navbar badge
  const urgentDueCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.status !== 'done' && (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr) || t.urgency === 'high' || t.urgency === 'urgent')).length;
  }, [tasks]);

  // Helper compartilhado para gerar próxima ocorrência de tarefa recorrente ao concluir
  const createNextRecurrentOccurrence = (completedTask: Task): Task | null => {
    if (!completedTask.recurrence || completedTask.recurrence === 'single') {
      return null;
    }

    const nextDueDate = calculateNextDueDate(completedTask.dueDate, completedTask.recurrence);
    const resetSubtasks =
      completedTask.subtasks?.map(s => ({
        ...s,
        id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        completed: false,
      })) || [];
    const nowIso = new Date().toISOString();

    return {
      id: 'TASK-' + (Date.now() + 1).toString().slice(-4),
      title: completedTask.title,
      company: completedTask.company || '',
      description: completedTask.description || '',
      ticket: completedTask.ticket || '',
      status: 'todo',
      urgency: completedTask.urgency || 'medium',
      recurrence: completedTask.recurrence,
      assignees: completedTask.assignees || [],
      dueDate: nextDueDate,
      tags: completedTask.tags || [],
      attachments: completedTask.attachments || [],
      subtasks: resetSubtasks,
      source: 'web',
      createdAt: nowIso,
      updatedAt: nowIso,
      order: 0,
    };
  };

  // Resolve quem concluiu a tarefa: nome de exibição (ou e-mail) do usuário logado, com fallback para assignees[0]
  const resolveCompletedBy = useCallback(
    (taskAssignees?: Assignee[]): string | undefined => {
      const userLabel = currentUser?.name?.trim() || currentUser?.email?.trim();
      if (userLabel) return userLabel;
      const firstAssignee = taskAssignees?.[0];
      const assigneeLabel = firstAssignee?.name?.trim() || firstAssignee?.email?.trim();
      return assigneeLabel || undefined;
    },
    [currentUser]
  );

  // Handlers for Task Operations (CRUD)
  const handleCreateOrUpdateTask = async (taskData: Partial<Task>) => {
    const isEdit = Boolean(editingTask);

    if (isEdit && editingTask) {
      const normalizedStatus = normalizeTaskStatus(taskData.status ?? editingTask.status);
      const nowIso = new Date().toISOString();
      const wasNotDone = editingTask.status !== 'done';
      const isNowDone = normalizedStatus === 'done';
      const resolvedAssignees = taskData.assignees ?? editingTask.assignees;
      const completedByValue = isNowDone
        ? (wasNotDone
            ? resolveCompletedBy(resolvedAssignees) ?? editingTask.completedBy
            : editingTask.completedBy ?? resolveCompletedBy(resolvedAssignees))
        : undefined;

      const updated: Task = {
        ...editingTask,
        ...taskData,
        status: normalizedStatus,
        gmailThreadId: taskData.gmailThreadId ?? editingTask.gmailThreadId,
        emailMessageId: taskData.emailMessageId ?? editingTask.emailMessageId,
        emailSubject: taskData.emailSubject ?? editingTask.emailSubject,
        emailFrom: taskData.emailFrom ?? editingTask.emailFrom,
        emailTo: taskData.emailTo ?? editingTask.emailTo,
        emailCc: taskData.emailCc ?? editingTask.emailCc,
        resolutionNote: taskData.resolutionNote !== undefined ? taskData.resolutionNote : editingTask.resolutionNote,
        source: taskData.source ?? editingTask.source ?? 'web',
        completedBy: completedByValue,
        updatedAt: nowIso,
      } as Task;

      if (wasNotDone && isNowDone) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.75 },
            colors: ['#10B981', '#3B82F6', '#6366F1', '#F59E0B']
          });
        } catch {
          // Safe fallback
        }
      }

      const nextRecurrentTask =
        wasNotDone && isNowDone ? createNextRecurrentOccurrence(updated) : null;

      // Protege contra sobrescrita por polling em andamento e aplica atualização otimista imediata
      pendingTaskSyncRef.current.set(updated.id, Date.now() + 8000);
      setTasks(prev => {
        const updatedList = prev.map(t => (t.id === updated.id ? updated : t));
        return nextRecurrentTask ? [nextRecurrentTask, ...updatedList] : updatedList;
      });
      setIsTaskModalOpen(false);
      setEditingTask(null);

      if (nextRecurrentTask) {
        const recLabels: Record<string, string> = {
          daily: 'diária',
          weekly: 'semanal',
          monthly: 'mensal',
          yearly: 'anual'
        };
        const label = recLabels[updated.recurrence!] || 'recorrente';
        addToast(
          'success',
          'Recorrência Gerada!',
          `Nova ocorrência ${label} criada para ${formatToBRDate(nextRecurrentTask.dueDate)} com checklist reiniciado.`
        );
        try {
          const savedRecurrent = await SupabaseService.saveTask(nextRecurrentTask);
          if (!savedRecurrent) {
            console.error('[App] Falha ao salvar nova ocorrência recorrente no Supabase:', nextRecurrentTask.id);
          }
        } catch (err) {
          console.error('[App] Erro ao salvar ocorrência recorrente no Supabase:', err);
        }
      } else if (wasNotDone && isNowDone) {
        addToast('success', 'Tarefa Concluída', `"${updated.title}" foi movida para Concluído.`);
      } else {
        addToast('success', 'Tarefa Atualizada', `"${updated.title}" foi atualizada.`);
      }

      // Sincroniza atualização no Supabase com tratamento e log de erros
      try {
        const result = await SupabaseService.updateTask(updated.id, updated);
        if (!result.success) {
          console.error('[App] Falha ao sincronizar atualização da tarefa no Supabase:', {
            taskId: updated.id,
            status: updated.status,
            source: updated.source,
            error: result.error,
          });
          addToast(
            'error',
            'Erro ao salvar no Supabase',
            result.error || 'Não foi possível persistir a atualização no banco de dados.'
          );
        }
      } catch (err) {
        console.error('[App] Exceção ao atualizar tarefa no Supabase:', err);
        addToast(
          'error',
          'Erro ao salvar no Supabase',
          'Falha de comunicação ao atualizar a tarefa no banco de dados.'
        );
      }
    } else {
      // If no assignees selected, automatically assign current authenticated user
      let defaultAssignees = taskData.assignees || [];
      if (defaultAssignees.length === 0 && currentUser) {
        const userAssignee = assignees.find(a => a.id === currentUser.id || a.email?.toLowerCase() === currentUser.email?.toLowerCase()) || {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          avatarUrl: currentUser.avatar || '',
          color: currentUser.color || 'bg-emerald-600 text-white',
          initials: currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        };
        defaultAssignees = [userAssignee];
      }

      const nowIso = new Date().toISOString();
      const newStatus = normalizeTaskStatus(taskData.status || defaultStatus);
      const newTask: Task = {
        id: 'TASK-' + Date.now().toString().slice(-4),
        title: taskData.title || 'Nova Tarefa',
        company: taskData.company || '',
        description: taskData.description || '',
        ticket: taskData.ticket || '',
        status: newStatus,
        urgency: taskData.urgency || 'medium',
        recurrence: taskData.recurrence || 'single',
        assignees: defaultAssignees,
        dueDate: taskData.dueDate || '',
        tags: taskData.tags || [],
        attachments: taskData.attachments || [],
        subtasks: taskData.subtasks || [],
        resolutionNote: taskData.resolutionNote || '',
        source: taskData.source || 'web',
        completedBy: newStatus === 'done' ? resolveCompletedBy(defaultAssignees) : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        order: tasks.length,
      };

      pendingTaskSyncRef.current.set(newTask.id, Date.now() + 8000);
      setTasks(prev => [newTask, ...prev]);
      setIsTaskModalOpen(false);
      addToast('success', 'Tarefa Criada', `"${newTask.title}" adicionada com sucesso.`);

      // Automatically sync to Supabase database
      try {
        const saved = await SupabaseService.saveTask(newTask);
        if (!saved) {
          console.error('[App] Falha ao criar tarefa no Supabase:', newTask.id);
          addToast('error', 'Erro ao salvar no Supabase', 'A tarefa foi criada localmente, mas falhou ao sincronizar.');
        }
      } catch (err) {
        console.error('[App] Exceção ao criar tarefa no Supabase:', err);
      }
    }
  };

  // Recurrence toggle handler (avulsa <-> mensal)
  const handleToggleRecurrence = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isRec = Boolean(t.recurrence && t.recurrence !== 'single');
        const nextRec: TaskRecurrence = isRec ? 'single' : 'monthly';
        const nowIso = new Date().toISOString();
        const updated = { ...t, recurrence: nextRec, updatedAt: nowIso };
        pendingTaskSyncRef.current.set(taskId, Date.now() + 8000);
        SupabaseService.updateTask(taskId, { recurrence: nextRec, updatedAt: nowIso })
          .then(res => {
            if (!res.success) {
              console.error('[App] Erro ao atualizar recorrência no Supabase:', res.error);
            }
          })
          .catch(err => console.error('[App] Exceção ao atualizar recorrência no Supabase:', err));
        addToast(
          'info',
          'Recorrência Alterada',
          nextRec !== 'single'
            ? `Tarefa "${t.title}" agora é recorrente mensal.`
            : `Tarefa "${t.title}" definida como avulsa.`
        );
        return updated;
      }
      return t;
    }));
  };

  // Fluxo único e padronizado de alteração de status / conclusão para tarefas manuais e importadas do Gmail
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const targetTask = tasksRef.current.find(t => t.id === taskId);
    if (!targetTask) return;

    const normalizedStatus = normalizeTaskStatus(newStatus);
    const wasNotDone = targetTask.status !== 'done';
    const isNowDone = normalizedStatus === 'done';
    const nowIso = new Date().toISOString();

    if (isNowDone && wasNotDone) {
      // Confetti celebration when task is marked done!
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#10B981', '#3B82F6', '#6366F1', '#F59E0B']
        });
      } catch {
        // Safe fallback
      }
    }

    const completedByValue = isNowDone
      ? (resolveCompletedBy(targetTask.assignees) ?? targetTask.completedBy)
      : undefined;

    const updatedTask: Task = {
      ...targetTask,
      status: normalizedStatus,
      gmailThreadId: targetTask.gmailThreadId,
      emailMessageId: targetTask.emailMessageId,
      emailSubject: targetTask.emailSubject,
      emailFrom: targetTask.emailFrom,
      emailTo: targetTask.emailTo,
      emailCc: targetTask.emailCc,
      resolutionNote: targetTask.resolutionNote,
      source: targetTask.source || 'web',
      completedBy: completedByValue,
      updatedAt: nowIso,
    };

    const nextRecurrentTask =
      isNowDone && wasNotDone ? createNextRecurrentOccurrence(updatedTask) : null;

    // Atualização otimista imediata no estado local (remove de "A Fazer" e move para "Concluído")
    pendingTaskSyncRef.current.set(taskId, Date.now() + 8000);
    setTasks(prev => {
      const updatedList = prev.map(t => (t.id === taskId ? updatedTask : t));
      return nextRecurrentTask ? [nextRecurrentTask, ...updatedList] : updatedList;
    });

    if (nextRecurrentTask) {
      const recLabels: Record<string, string> = {
        daily: 'diária',
        weekly: 'semanal',
        monthly: 'mensal',
        yearly: 'anual'
      };
      const label = recLabels[targetTask.recurrence!] || 'recorrente';
      addToast(
        'success',
        'Recorrência Gerada!',
        `Nova ocorrência ${label} criada para ${formatToBRDate(nextRecurrentTask.dueDate)} com checklist reiniciado.`
      );
      try {
        const savedRecurrent = await SupabaseService.saveTask(nextRecurrentTask);
        if (!savedRecurrent) {
          console.error('[App] Falha ao salvar nova ocorrência recorrente no Supabase:', nextRecurrentTask.id);
        }
      } catch (err) {
        console.error('[App] Exceção ao salvar ocorrência recorrente no Supabase:', err);
      }
    } else {
      addToast(
        isNowDone ? 'success' : 'info',
        isNowDone ? 'Tarefa Concluída' : 'Status Atualizado',
        `Movida para ${normalizedStatus === 'done' ? 'Concluído' : normalizedStatus === 'in_progress' ? 'Em Progresso' : 'A Fazer'}`
      );
    }

    // Executa updateTask no Supabase preservando metadados do Gmail e resolutionNote, tratando e logando erros
    try {
      const result = await SupabaseService.updateTask(taskId, {
        status: normalizedStatus,
        updatedAt: nowIso,
        recurrence: updatedTask.recurrence,
        gmailThreadId: updatedTask.gmailThreadId,
        emailMessageId: updatedTask.emailMessageId,
        emailSubject: updatedTask.emailSubject,
        emailFrom: updatedTask.emailFrom,
        emailTo: updatedTask.emailTo,
        emailCc: updatedTask.emailCc,
        resolutionNote: updatedTask.resolutionNote,
        source: updatedTask.source || 'web',
        completedBy: updatedTask.completedBy,
      });

      if (!result.success) {
        console.error('[App] Falha ao atualizar status da tarefa no Supabase:', {
          taskId,
          status: normalizedStatus,
          source: updatedTask.source,
          error: result.error,
        });
        addToast(
          'error',
          'Erro ao salvar no Supabase',
          result.error || 'A tarefa foi movida localmente, mas houve falha ao salvar no banco de dados.'
        );
      }
    } catch (err) {
      console.error('[App] Exceção ao atualizar status da tarefa no Supabase:', {
        taskId,
        status: normalizedStatus,
        source: updatedTask.source,
        error: err,
      });
      addToast(
        'error',
        'Erro ao salvar no Supabase',
        'Falha de comunicação ao atualizar o status da tarefa no Supabase.'
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setIsTaskModalOpen(false);
    setEditingTask(null);

    addToast('warning', 'Tarefa Removida', taskToDelete ? `"${taskToDelete.title}" foi excluída.` : 'Tarefa excluída.');

    // Automatically sync to Supabase database
    SupabaseService.deleteTask(taskId).catch(e => console.error('[App] Supabase deleteTask failed:', e));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) || [];
        const nowIso = new Date().toISOString();
        const updated = { ...t, subtasks: updatedSubs, updatedAt: nowIso };
        pendingTaskSyncRef.current.set(taskId, Date.now() + 8000);
        
        // Automatically sync to Supabase database
        SupabaseService.updateTask(taskId, { subtasks: updatedSubs, updatedAt: nowIso })
          .then(res => {
            if (!res.success) {
              console.error('[App] Erro ao atualizar subtarefa no Supabase:', res.error);
            }
          })
          .catch(err => console.error('[App] Exceção ao atualizar subtarefa no Supabase:', err));
        return updated;
      }
      return t;
    }));
  };

  const handleOpenNewTask = (status: TaskStatus = 'todo', date = '') => {
    setEditingTask(null);
    setDefaultStatus(status);
    setDefaultDate(date || new Date().toISOString().split('T')[0]);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  // Spreadsheet Tasks Import Handler
  const handleImportTasksFromSpreadsheet = (tasksData: Partial<Task>[]) => {
    if (tasksData.length === 0) return;

    const newTasks: Task[] = tasksData.map((data, idx) => ({
      id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      title: data.title || 'Tarefa Importada',
      description: data.description || '',
      company: data.company || '',
      ticket: data.ticket || '',
      urgency: data.urgency || 'medium',
      status: data.status || 'todo',
      assignees: data.assignees || [],
      dueDate: data.dueDate || '',
      tags: data.tags || ['planilha'],
      subtasks: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: tasks.length + idx + 1,
    }));

    setTasks(prev => [...newTasks, ...prev]);
    addToast('success', 'Planilha Importada com Sucesso', `${newTasks.length} novas tarefas foram criadas.`);
    try {
      confetti({ particleCount: 65, spread: 80, origin: { y: 0.75 } });
    } catch (e) {
      // ignore
    }

    // Automatically sync batch to Supabase database
    SupabaseService.syncAllTasks(newTasks).catch(e => console.warn('Supabase batch save failed', e));
  };

  // 1. Initial Auth verification loading screen
  if (isVerifyingAuth) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center gap-3 p-8">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Verificando autenticação no Supabase...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: Only display AuthView (activities remain locked and invisible)
  if (!currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <AuthView
          isDarkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            addToast('success', `Bem-vindo, ${user.name}!`, 'Autenticação no Supabase confirmada.');
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  // 3. Authenticated: Full access to tasks, kanban, metrics and team activities
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-y-auto">
      
      {/* Header Navigation */}
      <Navbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenNewTask={() => handleOpenNewTask('todo')}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenSpreadsheet={() => setIsSpreadsheetModalOpen(true)}
        urgentDueCount={urgentDueCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Advanced Filter Bar (Visible on Kanban, List, and Calendar) */}
      {viewMode !== 'reports' && (
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          assignees={assignees}
          availableTags={availableTags}
          availableCompanies={availableCompanies}
          availableTickets={availableTickets}
          companyCounts={companyCounts}
          statusCounts={statusCounts}
          urgencyCounts={urgencyCounts}
          dateCounts={dateCounts}
          totalTasksCount={tasks.length}
          filteredTasksCount={filteredTasks.length}
        />
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col">
        {viewMode === 'kanban' && (
          <KanbanView
            tasks={filteredTasks}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onToggleRecurrence={handleToggleRecurrence}
            onAddTaskWithStatus={(st) => handleOpenNewTask(st)}
            onQuickCreateTask={(taskData) => {
              let defaultAssignees = taskData.assignees || [];
              if (defaultAssignees.length === 0 && currentUser) {
                const userAssignee = assignees.find(a => a.id === currentUser.id || a.email?.toLowerCase() === currentUser.email?.toLowerCase()) || {
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  role: currentUser.role,
                  avatarUrl: currentUser.avatar || '',
                  color: currentUser.color || 'bg-emerald-600 text-white',
                  initials: currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                };
                defaultAssignees = [userAssignee];
              }

              const quickStatus = normalizeTaskStatus(taskData.status || 'todo');
              const nowIso = new Date().toISOString();
              const newTask: Task = {
                id: `task_${Date.now()}`,
                title: taskData.title || 'Nova Tarefa',
                company: taskData.company || '',
                ticket: taskData.ticket || '',
                description: taskData.description || '',
                urgency: taskData.urgency || 'medium',
                status: quickStatus,
                recurrence: taskData.recurrence || 'single',
                assignees: defaultAssignees,
                dueDate: taskData.dueDate || '',
                tags: [],
                subtasks: [],
                attachments: [],
                source: 'web',
                completedBy: quickStatus === 'done' ? resolveCompletedBy(defaultAssignees) : undefined,
                createdAt: nowIso,
                updatedAt: nowIso,
                order: tasks.length + 1,
              };
              setTasks(prev => [newTask, ...prev]);
              addToast('success', 'Tarefa Adicionada', `"${newTask.title}" foi criada no Planner.`);
              
              // Automatically sync to Supabase database
              SupabaseService.saveTask(newTask).catch(e => console.warn('Supabase quick create failed', e));
            }}
          />
        )}

        {viewMode === 'list' && (
          <div className="flex-1">
            <ListView
              tasks={filteredTasks}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onToggleSubtask={handleToggleSubtask}
              onAddNewTask={() => handleOpenNewTask('todo')}
              onToggleRecurrence={handleToggleRecurrence}
            />
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="flex-1">
            <CalendarView
              tasks={filteredTasks}
              onEditTask={handleOpenEditTask}
              onAddNewTaskWithDate={(dateStr) => handleOpenNewTask('todo', dateStr)}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}

        {viewMode === 'reports' && (
          <div className="flex-1">
            <ReportsView
              tasks={tasks}
              assignees={assignees}
            />
          </div>
        )}
      </main>

      {/* Slim status footer */}
      {viewMode !== 'kanban' && (
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-2.5 px-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Today-To-Do</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                Sincronização Automática
              </span>
            </div>
            <div>
              Gestão de Tarefas & Equipes
            </div>
          </div>
        </footer>
      )}

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleCreateOrUpdateTask}
        onDelete={editingTask ? handleDeleteTask : undefined}
        initialTask={editingTask}
        defaultStatus={defaultStatus}
        defaultDate={defaultDate}
        assignees={assignees}
      />

      {/* Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        tasks={tasks}
        onOpenTask={handleOpenEditTask}
      />

      {/* Spreadsheet Tasks Import (.csv / .xlsx) Modal */}
      <SpreadsheetImportModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        onImportTasks={handleImportTasksFromSpreadsheet}
        assignees={assignees}
      />

      {/* Floating Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}
