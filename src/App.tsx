/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Main tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load backup tasks', e);
    }
    return INITIAL_TASKS;
  });

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
          setTasks(prev => {
            return tasksRes.tasks.map(rem => {
              const local = prev.find(p => p.id === rem.id);
              return {
                ...rem,
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
          setTasks(prev => {
            const prevStr = JSON.stringify(prev.map(t => ({ id: t.id, status: t.status, recurrence: t.recurrence, updatedAt: t.updatedAt })));
            const nextStr = JSON.stringify(tasksRes.tasks.map(t => ({ id: t.id, status: t.status, recurrence: t.recurrence, updatedAt: t.updatedAt })));
            if (prevStr === nextStr) return prev;
            return tasksRes.tasks.map(rem => {
              const local = prev.find(p => p.id === rem.id);
              return {
                ...rem,
                recurrence: (rem.recurrence && rem.recurrence !== 'single') ? rem.recurrence : (local?.recurrence || rem.recurrence || 'single')
              };
            });
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
            setTasks(prev => {
              return res.tasks.map(rem => {
                const local = prev.find(p => p.id === rem.id);
                return {
                  ...rem,
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

  // Handlers for Task Operations (CRUD)
  const handleCreateOrUpdateTask = async (taskData: Partial<Task>) => {
    const isEdit = Boolean(editingTask);

    if (isEdit && editingTask) {
      const updated: Task = {
        ...editingTask,
        ...taskData,
        updatedAt: new Date().toISOString(),
      } as Task;

      const wasNotDone = editingTask.status !== 'done';
      const isNowDone = updated.status === 'done';
      const isRecurrent = Boolean(updated.recurrence && updated.recurrence !== 'single');

      let nextRecurrentTask: Task | null = null;
      if (wasNotDone && isNowDone && isRecurrent) {
        const nextDueDate = calculateNextDueDate(updated.dueDate, updated.recurrence);
        const resetSubtasks = updated.subtasks?.map(s => ({
          ...s,
          id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          completed: false
        })) || [];

        nextRecurrentTask = {
          id: 'TASK-' + (Date.now() + 1).toString().slice(-4),
          title: updated.title,
          company: updated.company || '',
          description: updated.description || '',
          ticket: updated.ticket || '',
          status: 'todo',
          urgency: updated.urgency || 'medium',
          recurrence: updated.recurrence,
          assignees: updated.assignees || [],
          dueDate: nextDueDate,
          tags: updated.tags || [],
          attachments: updated.attachments || [],
          subtasks: resetSubtasks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: 0,
        };
      }

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
        SupabaseService.saveTask(nextRecurrentTask).catch(e => console.warn('Supabase save recurrent task failed', e));
      } else {
        addToast('success', 'Tarefa Atualizada', `"${updated.title}" foi atualizada.`);
      }

      // Automatically sync to Supabase database
      SupabaseService.updateTask(updated.id, updated).catch(e => console.warn('Supabase update failed', e));
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

      const newTask: Task = {
        id: 'TASK-' + Date.now().toString().slice(-4),
        title: taskData.title || 'Nova Tarefa',
        company: taskData.company || '',
        description: taskData.description || '',
        ticket: taskData.ticket || '',
        status: taskData.status || defaultStatus,
        urgency: taskData.urgency || 'medium',
        recurrence: taskData.recurrence || 'single',
        assignees: defaultAssignees,
        dueDate: taskData.dueDate || '',
        tags: taskData.tags || [],
        attachments: taskData.attachments || [],
        subtasks: taskData.subtasks || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: tasks.length,
      };

      setTasks(prev => [newTask, ...prev]);
      setIsTaskModalOpen(false);
      addToast('success', 'Tarefa Criada', `"${newTask.title}" adicionada com sucesso.`);

      // Automatically sync to Supabase database
      SupabaseService.saveTask(newTask).catch(e => console.warn('Supabase saveTask failed', e));
    }
  };

  // Recurrence toggle handler (avulsa <-> mensal)
  const handleToggleRecurrence = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isRec = Boolean(t.recurrence && t.recurrence !== 'single');
        const nextRec: TaskRecurrence = isRec ? 'single' : 'monthly';
        const updated = { ...t, recurrence: nextRec, updatedAt: new Date().toISOString() };
        SupabaseService.updateTask(taskId, { recurrence: nextRec }).catch(console.warn);
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

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    if (newStatus === 'done' && targetTask.status !== 'done') {
      // Confetti celebration when task is marked done!
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#10B981', '#3B82F6', '#6366F1', '#F59E0B']
        });
      } catch (e) {
        // Safe fallback
      }
    }

    const updatedTask: Task = { ...targetTask, status: newStatus, updatedAt: new Date().toISOString() };

    // Recurrence logic: if marking as done and task is recurrent, automatically generate the next occurrence
    let nextRecurrentTask: Task | null = null;
    if (newStatus === 'done' && targetTask.status !== 'done' && targetTask.recurrence && targetTask.recurrence !== 'single') {
      const nextDueDate = calculateNextDueDate(targetTask.dueDate, targetTask.recurrence);
      const resetSubtasks = targetTask.subtasks?.map(s => ({
        ...s,
        id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        completed: false
      })) || [];

      nextRecurrentTask = {
        id: 'TASK-' + (Date.now() + 1).toString().slice(-4),
        title: targetTask.title,
        company: targetTask.company || '',
        description: targetTask.description || '',
        ticket: targetTask.ticket || '',
        status: 'todo',
        urgency: targetTask.urgency || 'medium',
        recurrence: targetTask.recurrence,
        assignees: targetTask.assignees || [],
        dueDate: nextDueDate,
        tags: targetTask.tags || [],
        attachments: targetTask.attachments || [],
        subtasks: resetSubtasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
      };
    }

    setTasks(prev => {
      const updatedList = prev.map(t => (t.id === taskId ? updatedTask : t));
      if (nextRecurrentTask) {
        return [nextRecurrentTask, ...updatedList];
      }
      return updatedList;
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
      SupabaseService.saveTask(nextRecurrentTask).catch(e => console.warn('Supabase save recurrent task failed', e));
    } else {
      addToast('info', 'Status Atualizado', `Movida para ${newStatus === 'done' ? 'Concluído' : newStatus === 'in_progress' ? 'Em Progresso' : 'A Fazer'}`);
    }

    // Automatically sync to Supabase database
    SupabaseService.updateTask(taskId, { status: newStatus, recurrence: updatedTask.recurrence }).catch(e => console.warn('Supabase status update failed', e));
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setIsTaskModalOpen(false);
    setEditingTask(null);

    addToast('warning', 'Tarefa Removida', taskToDelete ? `"${taskToDelete.title}" foi excluída.` : 'Tarefa excluída.');

    // Automatically sync to Supabase database
    SupabaseService.deleteTask(taskId).catch(e => console.warn('Supabase deleteTask failed', e));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) || [];
        const updated = { ...t, subtasks: updatedSubs, updatedAt: new Date().toISOString() };
        
        // Automatically sync to Supabase database
        SupabaseService.updateTask(taskId, { subtasks: updatedSubs }).catch(console.warn);
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
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      
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

      {/* Main Viewport Container (Fits strictly in single screen) */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
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

              const newTask: Task = {
                id: `task_${Date.now()}`,
                title: taskData.title || 'Nova Tarefa',
                description: taskData.description || '',
                urgency: taskData.urgency || 'medium',
                status: taskData.status || 'todo',
                recurrence: taskData.recurrence || 'single',
                assignees: defaultAssignees,
                dueDate: taskData.dueDate || '',
                tags: [],
                subtasks: [],
                attachments: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
          <div className="flex-1 min-h-0 overflow-y-auto">
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CalendarView
              tasks={filteredTasks}
              onEditTask={handleOpenEditTask}
              onAddNewTaskWithDate={(dateStr) => handleOpenNewTask('todo', dateStr)}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}

        {viewMode === 'reports' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
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
