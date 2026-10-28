import { Assignee, Task } from '../types';

export const INITIAL_ASSIGNEES: Assignee[] = [
  {
    id: 'user-1',
    name: 'Ana Carolina Silva',
    email: 'ana.silva@empresa.com',
    initials: 'AS',
    color: 'bg-emerald-600 text-white',
    role: 'Product Manager',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-2',
    name: 'Lucas Ferreira',
    email: 'lucas.f@empresa.com',
    initials: 'LF',
    color: 'bg-blue-600 text-white',
    role: 'Tech Lead Frontend',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-3',
    name: 'Mariana Costa',
    email: 'mariana.costa@empresa.com',
    initials: 'MC',
    color: 'bg-purple-600 text-white',
    role: 'UI/UX Designer',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-4',
    name: 'Rodrigo Santos',
    email: 'rodrigo.s@empresa.com',
    initials: 'RS',
    color: 'bg-amber-600 text-white',
    role: 'Backend Engineer',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-5',
    name: 'Beatriz Lima',
    email: 'beatriz.l@empresa.com',
    initials: 'BL',
    color: 'bg-rose-600 text-white',
    role: 'QA & DevOps',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  }
];

export const PREDEFINED_TAGS = [
  'Frontend',
  'Backend',
  'Design System',
  'Banco de Dados',
  'Sprint 24',
  'Bugfix',
  'Segurança',
  'Refatoração',
  'Mobile',
  'Documentação'
];

export const TAG_COLORS: Record<string, { bg: string; text: string; border: string; darkBg: string }> = {
  'Frontend': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', darkBg: 'dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800' },
  'Backend': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', darkBg: 'dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800' },
  'Design System': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', darkBg: 'dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800' },
  'Banco de Dados': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', darkBg: 'dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800' },
  'Sprint 24': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', darkBg: 'dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800' },
  'Bugfix': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', darkBg: 'dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800' },
  'Segurança': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', darkBg: 'dark:bg-red-950/70 dark:text-red-300 dark:border-red-800' },
  'Refatoração': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', darkBg: 'dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800' },
  'Mobile': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', darkBg: 'dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800' },
  'Documentação': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', darkBg: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
};

export function getTagStyle(tag: string) {
  if (TAG_COLORS[tag]) {
    return `${TAG_COLORS[tag].bg} ${TAG_COLORS[tag].text} ${TAG_COLORS[tag].border} ${TAG_COLORS[tag].darkBg}`;
  }
  // Generate consistent pseudo-random color for custom user-created tags
  const colors = [
    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 dark:border-fuchsia-800',
    'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-950/70 dark:text-lime-300 dark:border-lime-800',
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800'
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Helper to calculate dates relative to current day
function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const INITIAL_TASKS: Task[] = [
  {
    id: 'TASK-101',
    title: 'Configurar tabelas e sincronização automática do banco',
    company: 'Soma CSC',
    ticket: 'CHAM-8842',
    description: 'Definir estrutura das tabelas de tarefas e membros com persistência e sincronização em segundo plano transparente.',
    status: 'in_progress',
    urgency: 'high',
    assignees: [INITIAL_ASSIGNEES[1], INITIAL_ASSIGNEES[3]],
    dueDate: getDateOffset(0), // Hoje
    tags: ['Banco de Dados', 'Backend', 'Sprint 24'],
    attachments: [
      { id: 'att-1', title: 'Documentação do Banco de Dados', url: 'https://supabase.com/docs', type: 'doc' },
      { id: 'att-2', title: 'Painel do Banco', url: 'https://supabase.com/dashboard', type: 'doc' }
    ],
    subtasks: [
      { id: 'sub-1', title: 'Definir esquemas das tabelas tasks e team_members', completed: true },
      { id: 'sub-2', title: 'Configurar sincronização automática em segundo plano', completed: true },
      { id: 'sub-3', title: 'Habilitar cache local persistente', completed: true },
      { id: 'sub-4', title: 'Testar criação e atualização de tarefas', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0
  },
  {
    id: 'TASK-102',
    title: 'Ajustar Design System e Modo Escuro no Planner',
    company: 'Acme Corp',
    ticket: 'CHAM-8910',
    description: 'Revisar paleta de alto contraste, tipografia Plus Jakarta Sans e transições suaves entre temas claro e escuro em todos os componentes.',
    status: 'in_progress',
    urgency: 'high',
    assignees: [INITIAL_ASSIGNEES[2], INITIAL_ASSIGNEES[0]],
    dueDate: getDateOffset(1), // Amanhã
    tags: ['Design System', 'Frontend'],
    attachments: [
      { id: 'att-3', title: 'Figma UI Planner Pro', url: 'https://figma.com', type: 'figma' }
    ],
    subtasks: [
      { id: 'sub-5', title: 'Garantir conformidade com WCAG AA', completed: true },
      { id: 'sub-6', title: 'Validar cartões no modo escuro profundo', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1
  },
  {
    id: 'TASK-103',
    title: 'Implementar notificações no navegador (Web Notifications)',
    company: 'Soma CSC',
    ticket: 'CHAM-8921',
    description: 'Adicionar alerta para tarefas urgentes do dia com controle de permissão e sinal sonoro sutil.',
    status: 'todo',
    urgency: 'high',
    assignees: [INITIAL_ASSIGNEES[1]],
    dueDate: getDateOffset(0), // Hoje
    tags: ['Frontend', 'Sprint 24'],
    attachments: [],
    subtasks: [
      { id: 'sub-7', title: 'Criar hook de permissão de notificação', completed: false },
      { id: 'sub-8', title: 'Disparar verificação periódica de tarefas no prazo', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0
  },
  {
    id: 'TASK-104',
    title: 'Auditoria de segurança e tratamento de falhas offline',
    company: 'Global Logística',
    ticket: 'CHAM-8730',
    description: 'Verificar comportamento da aplicação quando a conexão de rede oscilar ou a URL da planilha for inválida.',
    status: 'todo',
    urgency: 'medium',
    assignees: [INITIAL_ASSIGNEES[4]],
    dueDate: getDateOffset(4),
    tags: ['Segurança', 'QA & DevOps'],
    attachments: [
      { id: 'att-4', title: 'Checklist de QA e Resiliência', url: 'https://drive.google.com', type: 'drive' }
    ],
    subtasks: [
      { id: 'sub-9', title: 'Simular timeout de requisição', completed: false },
      { id: 'sub-10', title: 'Exibir toasts informativos de retry', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1
  },
  {
    id: 'TASK-105',
    title: 'Refatoração da visualização em Calendário e Relatórios',
    company: 'Nexus Tech',
    ticket: 'CHAM-8655',
    description: 'Aprimorar a visualização de prazos mensais com cálculo automático da velocidade da equipe e métricas de urgência.',
    status: 'done',
    urgency: 'medium',
    assignees: [INITIAL_ASSIGNEES[0], INITIAL_ASSIGNEES[2]],
    dueDate: getDateOffset(-2), // Concluída
    tags: ['Frontend', 'Refatoração'],
    attachments: [],
    subtasks: [
      { id: 'sub-11', title: 'Montar grade interativa de dias do mês', completed: true },
      { id: 'sub-12', title: 'Criar gráficos de progresso semanal', completed: true },
      { id: 'sub-13', title: 'Adicionar filtro rápido por data no calendário', completed: true }
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0
  },
  {
    id: 'TASK-106',
    title: 'Atualizar documentação de processos e fluxo de tarefas',
    company: 'Soma CSC',
    ticket: 'CHAM-8540',
    description: 'Documentar boas práticas de atribuição de tarefas, prazos e fechamento financeiro para a equipe de operações.',
    status: 'done',
    urgency: 'low',
    assignees: [INITIAL_ASSIGNEES[0]],
    dueDate: getDateOffset(-1), // Ontem
    tags: ['Documentação'],
    attachments: [
      { id: 'att-5', title: 'Guia de Processos Internos', url: 'https://github.com', type: 'doc' }
    ],
    subtasks: [
      { id: 'sub-14', title: 'Documentar fluxo de status do Kanban', completed: true },
      { id: 'sub-15', title: 'Revisar instruções de importação de planilhas', completed: true }
    ],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1
  }
];
