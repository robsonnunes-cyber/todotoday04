export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskUrgency = 'low' | 'medium' | 'high' | 'urgent';

export interface Assignee {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  color: string;
  role: string;
}

export interface Attachment {
  id: string;
  title: string;
  url: string;
  type?: 'link' | 'doc' | 'sheet' | 'drive' | 'github' | 'figma' | 'image' | 'file';
  size?: string;
  fileName?: string;
  dataUrl?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskRecurrence = 'single' | 'daily' | 'weekly' | 'monthly' | 'yearly'; // 'single' = Avulsa, 'monthly' = Recorrente Mensal, etc.

export interface Task {
  id: string;
  title: string;
  company?: string;
  ticket?: string;
  description: string;
  status: TaskStatus;
  urgency: TaskUrgency;
  recurrence?: TaskRecurrence;
  assignees: Assignee[];
  dueDate: string; // YYYY-MM-DD
  tags: string[];
  attachments: Attachment[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  order: number;
}

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'reports';

export type DateFilterOption = 'all' | 'overdue' | 'today' | 'this_week' | 'next_week' | 'this_month' | 'custom' | 'no_date';

export interface FilterState {
  search: string;
  statuses: TaskStatus[];
  urgencies: TaskUrgency[];
  assigneeIds: string[];
  tags: string[];
  companies: string[];
  ticketSearch: string;
  dateFilter: DateFilterOption;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  selectedMonthYear: string; // 'all' or 'YYYY-MM'
  recurrenceFilter: 'all' | 'single' | 'recurring' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  sortBy: 'urgency' | 'dueDate' | 'title' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export type ConnectionStatus = 'idle' | 'syncing' | 'connected' | 'error' | 'demo';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
  color?: string;
}

export interface AuthSession {
  user: AuthUser;
  token?: string;
  expiresAt?: number;
}
