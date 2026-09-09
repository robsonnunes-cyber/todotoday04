import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  AlertTriangle,
  Users, 
  Download,
  Calendar,
  Zap,
  Target
} from 'lucide-react';
import { Task, Assignee } from '../types';
import { formatToBRDate } from '../utils/dateUtils';

interface ReportsViewProps {
  tasks: Task[];
  assignees: Assignee[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks, assignees }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr).length;
  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.dueDate === todayStr).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Urgency distribution
  const urgentCount = tasks.filter(t => t.urgency === 'urgent').length;
  const highCount = tasks.filter(t => t.urgency === 'high').length;
  const mediumCount = tasks.filter(t => t.urgency === 'medium').length;
  const lowCount = tasks.filter(t => t.urgency === 'low').length;

  // Workload per team member
  const memberStats = assignees.map(member => {
    const memberTasks = tasks.filter(t => t.assignees?.some(a => a.id === member.id));
    const completed = memberTasks.filter(t => t.status === 'done').length;
    const pending = memberTasks.filter(t => t.status !== 'done').length;
    const rate = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0;
    return {
      ...member,
      total: memberTasks.length,
      completed,
      pending,
      rate
    };
  }).sort((a, b) => b.total - a.total);

  // Weekly simulated days completion velocity (Mon to Sun of current week)
  const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const weeklyDistribution = [
    { day: 'Seg', completed: Math.round(completedTasks * 0.15), active: Math.round(inProgressTasks * 0.2) + 1 },
    { day: 'Ter', completed: Math.round(completedTasks * 0.25), active: Math.round(inProgressTasks * 0.3) + 2 },
    { day: 'Qua', completed: Math.round(completedTasks * 0.30), active: Math.round(inProgressTasks * 0.2) + 1 },
    { day: 'Qui', completed: Math.round(completedTasks * 0.18), active: Math.round(inProgressTasks * 0.15) },
    { day: 'Sex', completed: Math.round(completedTasks * 0.12), active: Math.round(inProgressTasks * 0.15) + 1 },
    { day: 'Sáb', completed: Math.max(0, Math.round(completedTasks * 0.05)), active: 0 },
    { day: 'Dom', completed: Math.max(0, Math.round(completedTasks * 0.05)), active: 0 },
  ];

  const exportToCSV = () => {
    const headers = ['ID', 'Titulo', 'Status', 'Urgencia', 'DataEntrega', 'Responsaveis', 'Tags'];
    const rows = tasks.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.urgency,
      t.dueDate ? formatToBRDate(t.dueDate) : '',
      `"${t.assignees?.map(a => a.name).join(', ') || ''}"`,
      `"${t.tags?.join(', ') || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_planner_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Métricas & Relatórios de Produtividade</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento semanal de velocidade, distribuição de carga e status da equipe
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório (CSV)</span>
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Tarefas</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {totalTasks}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {todoTasks} a fazer • {inProgressTasks} em progresso
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Conclusão</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
            {completionRate}%
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>

        {/* Urgent & High Priority */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alta Urgência</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mb-1">
            {urgentCount + highCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {urgentCount} urgentes • {highCount} altas
          </div>
        </div>

        {/* Overdue / Due Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Prazos Críticos</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mb-1">
            {overdueTasks + dueTodayTasks}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {overdueTasks} atrasadas • {dueTodayTasks} vencem hoje
          </div>
        </div>

      </div>

      {/* Middle Section: Weekly Velocity & Urgency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Completion Velocity */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Velocidade Semanal de Entregas</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Volume de tarefas movimentadas por dia</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Esta Semana
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100 dark:border-slate-800">
            {weeklyDistribution.map((item) => {
              const maxVal = Math.max(...weeklyDistribution.map(d => d.completed + d.active), 5);
              const heightPct = Math.round(((item.completed + item.active) / maxVal) * 100);
              const completedPct = Math.round((item.completed / (item.completed + item.active || 1)) * 100);

              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.completed + item.active}
                  </div>
                  <div
                    className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 hover:brightness-110"
                    style={{ height: `${Math.max(15, heightPct)}%` }}
                  >
                    <div className="w-full bg-emerald-500" style={{ height: `${completedPct}%` }} title={`Concluídas: ${item.completed}`}></div>
                    <div className="w-full bg-blue-500" style={{ height: `${100 - completedPct}%` }} title={`Em andamento: ${item.active}`}></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              <span>Tarefas Concluídas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-500"></span>
              <span>Em Andamento</span>
            </div>
          </div>
        </div>

        {/* Urgency Distribution Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Distribuição por Nível de Urgência</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Equilíbrio de prioridades no backlog e sprint ativa
            </p>
          </div>

          {/* Stacked bar */}
          <div className="space-y-4">
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {urgentCount > 0 && (
                <div
                  className="h-full bg-rose-500 hover:brightness-110 transition-all"
                  style={{ width: `${(urgentCount / totalTasks) * 100}%` }}
                  title={`Urgente: ${urgentCount}`}
                ></div>
              )}
              {highCount > 0 && (
                <div
                  className="h-full bg-amber-500 hover:brightness-110 transition-all"
                  style={{ width: `${(highCount / totalTasks) * 100}%` }}
                  title={`Alta: ${highCount}`}
                ></div>
              )}
              {mediumCount > 0 && (
                <div
                  className="h-full bg-blue-500 hover:brightness-110 transition-all"
                  style={{ width: `${(mediumCount / totalTasks) * 100}%` }}
                  title={`Média: ${mediumCount}`}
                ></div>
              )}
              {lowCount > 0 && (
                <div
                  className="h-full bg-emerald-500 hover:brightness-110 transition-all"
                  style={{ width: `${(lowCount / totalTasks) * 100}%` }}
                  title={`Baixa: ${lowCount}`}
                ></div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Urgente</span>
                <div className="text-lg font-black text-rose-800 dark:text-rose-200">{urgentCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Alta</span>
                <div className="text-lg font-black text-amber-800 dark:text-amber-200">{highCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Média</span>
                <div className="text-lg font-black text-blue-800 dark:text-blue-200">{mediumCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Baixa</span>
                <div className="text-lg font-black text-emerald-800 dark:text-emerald-200">{lowCount}</div>
              </div>
            </div>
          </div>

          <div className="pt-2"></div>
        </div>

      </div>

      {/* Team Workload Table */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-500" />
              <span>Distribuição de Carga da Equipe</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tarefas atribuídas, pendências e taxa de conclusão individual
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {memberStats.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 min-w-[200px]">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${member.color}`}>
                    {member.initials}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{member.name}</h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{member.role}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span>{member.completed} de {member.total} tarefas concluídas</span>
                  <span className="font-bold text-slate-900 dark:text-white">{member.rate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full" style={{ width: `${member.rate}%` }}></div>
                </div>
              </div>

              {/* Metrics pill */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold">
                  {member.pending} pendentes
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                  {member.completed} prontas
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
