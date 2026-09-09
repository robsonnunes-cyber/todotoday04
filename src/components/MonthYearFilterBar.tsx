import React from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Repeat, 
  FileText, 
  Layers, 
  SlidersHorizontal,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { FilterState, TaskRecurrence } from '../types';

interface MonthYearFilterBarProps {
  selectedMonthYear?: string;
  onSelectMonthYear: (monthYear: string) => void;
  recurrenceFilter?: 'all' | 'single' | 'monthly';
  onSelectRecurrenceFilter: (filter: 'all' | 'single' | 'monthly') => void;
  availableMonthYears: string[];
  tasksCountByMonth: Record<string, number>;
  totalTasksCount: number;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const formatMonthYearLabel = (monthYearStr: string): string => {
  if (!monthYearStr || monthYearStr === 'all') return 'Todos os Meses';
  const [year, month] = monthYearStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${MONTH_NAMES_PT[monthIdx]} / ${year}`;
  }
  return monthYearStr;
};

export const MonthYearFilterBar: React.FC<MonthYearFilterBarProps> = ({
  selectedMonthYear,
  onSelectMonthYear,
  recurrenceFilter = 'all',
  onSelectRecurrenceFilter,
  availableMonthYears,
  tasksCountByMonth,
  totalTasksCount,
}) => {
  const currentMonthYear = new Date().toISOString().substring(0, 7);

  // Helper for navigating previous / next month
  const handleStepMonth = (direction: 'prev' | 'next') => {
    const baseStr = selectedMonthYear || currentMonthYear;
    const [yStr, mStr] = baseStr.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10);

    if (direction === 'prev') {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
    } else {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    const nextStr = `${year}-${String(month).padStart(2, '0')}`;
    onSelectMonthYear(nextStr);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-1">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left section: Month & Year Navigator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Mês e Ano:</span>
            </div>

            {/* Quick Month Pager */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => handleStepMonth('prev')}
                title="Mês anterior"
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
                {formatMonthYearLabel(selectedMonthYear || 'all')}
              </span>

              <button
                type="button"
                onClick={() => handleStepMonth('next')}
                title="Próximo mês"
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* "Todos os Meses" Button */}
            <button
              type="button"
              onClick={() => onSelectMonthYear('')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                !selectedMonthYear
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Todos os Meses ({totalTasksCount})
            </button>

            {/* Month Year Quick Pill Selector for existing months */}
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-md py-0.5 scrollbar-none">
              {availableMonthYears.map((my) => {
                const isSelected = selectedMonthYear === my;
                const count = tasksCountByMonth[my] || 0;
                const isCurrent = my === currentMonthYear;
                return (
                  <button
                    key={my}
                    type="button"
                    onClick={() => onSelectMonthYear(my)}
                    className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 font-bold border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{formatMonthYearLabel(my)}</span>
                    {count > 0 && (
                      <span className="text-[10px] opacity-75 font-semibold">({count})</span>
                    )}
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Mês atual"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right section: Recurrence Type Filter (Planner: Avulso vs. Recorrente Mensal) & Urgency badge */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Recurrence Filter Group */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => onSelectRecurrenceFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  recurrenceFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Todas
              </button>

              <button
                type="button"
                onClick={() => onSelectRecurrenceFilter('single')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  recurrenceFilter === 'single'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Tarefas avulsas únicas"
              >
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Avulsas</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectRecurrenceFilter('monthly')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  recurrenceFilter === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Tarefas que se repetem todo mês (estilo Microsoft Planner)"
              >
                <Repeat className="w-3 h-3 text-indigo-500" />
                <span>Recorrente Mensal</span>
              </button>
            </div>

            {/* Classification by Urgency Notice Badge */}
            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/60 text-[11px] font-medium">
              <Flame className="w-3 h-3 text-rose-500 shrink-0" />
              <span>Ordem: Mais urgente → Menos urgente</span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
