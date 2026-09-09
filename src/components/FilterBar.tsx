import React, { useState } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  User, 
  Tag as TagIcon, 
  Calendar, 
  AlertCircle, 
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  Building2,
  Ticket,
  CheckCircle2,
  Clock,
  Circle,
  CalendarRange
} from 'lucide-react';
import { FilterState, TaskStatus, TaskUrgency, Assignee, DateFilterOption } from '../types';
import { formatToBRDate } from '../utils/dateUtils';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  assignees: Assignee[];
  availableTags: string[];
  availableCompanies: string[];
  availableTickets: string[];
  companyCounts?: Record<string, number>;
  statusCounts?: Record<TaskStatus, number>;
  urgencyCounts?: Record<TaskUrgency, number>;
  totalTasksCount: number;
  filteredTasksCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  assignees,
  availableTags,
  availableCompanies,
  availableTickets,
  companyCounts = {},
  statusCounts = { todo: 0, in_progress: 0, done: 0 },
  urgencyCounts = { urgent: 0, high: 0, medium: 0, low: 0 },
  totalTasksCount,
  filteredTasksCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions: { value: TaskStatus; label: string; icon: any; activeClass: string }[] = [
    { 
      value: 'todo', 
      label: 'A Fazer', 
      icon: Circle,
      activeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 font-semibold' 
    },
    { 
      value: 'in_progress', 
      label: 'Em Andamento', 
      icon: Clock,
      activeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 font-semibold' 
    },
    { 
      value: 'done', 
      label: 'Concluído', 
      icon: CheckCircle2,
      activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 font-semibold' 
    },
  ];

  const urgencyOptions: { value: TaskUrgency; label: string; color: string; activeClass: string }[] = [
    { value: 'urgent', label: 'Urgente', color: 'bg-rose-500', activeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800' },
    { value: 'high', label: 'Alta', color: 'bg-amber-500', activeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800' },
    { value: 'medium', label: 'Média', color: 'bg-blue-500', activeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800' },
    { value: 'low', label: 'Baixa', color: 'bg-emerald-500', activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800' },
  ];

  const dateFilterOptions: { value: DateFilterOption; label: string }[] = [
    { value: 'all', label: 'Todas as datas' },
    { value: 'today', label: '📅 Hoje' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'this_month', label: 'Este Mês' },
    { value: 'next_week', label: 'Próxima Semana' },
    { value: 'overdue', label: '⚠️ Atrasadas' },
    { value: 'custom', label: '📆 Período...' },
    { value: 'no_date', label: 'Sem Data' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleTicketSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, ticketSearch: e.target.value });
  };

  const toggleStatus = (status: TaskStatus) => {
    const exists = filters.statuses.includes(status);
    const newStatuses = exists
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const toggleCompany = (company: string) => {
    const exists = filters.companies.includes(company);
    const newCompanies = exists
      ? filters.companies.filter(c => c !== company)
      : [...filters.companies, company];
    onFilterChange({ ...filters, companies: newCompanies });
  };

  const toggleUrgency = (urgency: TaskUrgency) => {
    const exists = filters.urgencies.includes(urgency);
    const newUrgencies = exists
      ? filters.urgencies.filter(u => u !== urgency)
      : [...filters.urgencies, urgency];
    onFilterChange({ ...filters, urgencies: newUrgencies });
  };

  const toggleAssignee = (assigneeId: string) => {
    const exists = filters.assigneeIds.includes(assigneeId);
    const newAssignees = exists
      ? filters.assigneeIds.filter(id => id !== assigneeId)
      : [...filters.assigneeIds, assigneeId];
    onFilterChange({ ...filters, assigneeIds: newAssignees });
  };

  const toggleTag = (tag: string) => {
    const exists = filters.tags.includes(tag);
    const newTags = exists
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const setDateFilter = (dateFilter: DateFilterOption) => {
    onFilterChange({ ...filters, dateFilter });
    if (dateFilter === 'custom' && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const resetFilters = () => {
    onFilterChange({
      search: '',
      statuses: [],
      urgencies: [],
      assigneeIds: [],
      tags: [],
      companies: [],
      ticketSearch: '',
      dateFilter: 'all',
      customStartDate: '',
      customEndDate: '',
      sortBy: 'dueDate',
      sortOrder: 'asc',
    });
  };

  // Count active filters
  const activeFiltersCount = 
    (filters.search.trim() ? 1 : 0) +
    (filters.ticketSearch.trim() ? 1 : 0) +
    filters.companies.length +
    filters.statuses.length +
    filters.urgencies.length +
    filters.assigneeIds.length +
    filters.tags.length +
    (filters.dateFilter !== 'all' ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
        
        {/* Main search and quick actions bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          
          {/* Global Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="filter-search-input"
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Buscar título, empresa, chamado, tags..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets & Toggle Advanced Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            
            {/* Quick date presets */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              {dateFilterOptions.slice(0, 5).map((opt) => {
                const isActive = filters.dateFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    id={`filter-date-${opt.value}`}
                    onClick={() => setDateFilter(opt.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Toggle Advanced Filters Button */}
            <button
              id="btn-toggle-advanced-filters"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all shrink-0 ${
                isExpanded || hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-600 text-white dark:bg-blue-500">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                id="btn-reset-filters"
                onClick={resetFilters}
                title="Limpar todos os filtros"
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}

          </div>

        </div>

        {/* DYNAMIC ACTIVE FILTER PILLS (Aparecem em tempo real conforme são selecionados) */}
        {hasActiveFilters && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 animate-fadeIn">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
              Filtros Ativos:
            </span>

            {/* Search Pill */}
            {filters.search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Search className="w-3 h-3 text-slate-400" />
                <span>Busca: "{filters.search}"</span>
                <button
                  onClick={() => onFilterChange({ ...filters, search: '' })}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Chamado Search Pill */}
            {filters.ticketSearch.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Ticket className="w-3 h-3 text-blue-500" />
                <span>Chamado: {filters.ticketSearch}</span>
                <button
                  onClick={() => onFilterChange({ ...filters, ticketSearch: '' })}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Companies Pills */}
            {filters.companies.map((company) => (
              <span 
                key={company}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                <Building2 className="w-3 h-3 text-blue-500" />
                <span>Empresa: {company}</span>
                <button
                  onClick={() => toggleCompany(company)}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Status Pills */}
            {filters.statuses.map((st) => {
              const opt = statusOptions.find(o => o.value === st);
              return (
                <span 
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                >
                  {opt && <opt.icon className="w-3 h-3 text-blue-500" />}
                  <span>Status: {opt?.label || st}</span>
                  <button
                    onClick={() => toggleStatus(st)}
                    className="hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Urgencies Pills */}
            {filters.urgencies.map((u) => {
              const opt = urgencyOptions.find(o => o.value === u);
              return (
                <span 
                  key={u}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${opt?.activeClass || ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opt?.color || 'bg-slate-400'}`}></span>
                  <span>Urgência: {opt?.label || u}</span>
                  <button
                    onClick={() => toggleUrgency(u)}
                    className="hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Assignees Pills */}
            {filters.assigneeIds.map((id) => {
              const user = assignees.find(a => a.id === id);
              return (
                <span 
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                >
                  <User className="w-3 h-3 text-blue-500" />
                  <span>{user?.name || id}</span>
                  <button
                    onClick={() => toggleAssignee(id)}
                    className="hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Tags Pills */}
            {filters.tags.map((tag) => (
              <span 
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
              >
                <TagIcon className="w-3 h-3 text-indigo-500" />
                <span>#{tag}</span>
                <button
                  onClick={() => toggleTag(tag)}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Date/Period Filter Pill */}
            {filters.dateFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <CalendarRange className="w-3 h-3 text-blue-500" />
                <span>
                  {filters.dateFilter === 'custom' 
                    ? `Período: ${filters.customStartDate ? formatToBRDate(filters.customStartDate) : 'Início'} até ${filters.customEndDate ? formatToBRDate(filters.customEndDate) : 'Fim'}`
                    : dateFilterOptions.find(d => d.value === filters.dateFilter)?.label || filters.dateFilter}
                </span>
                <button
                  onClick={() => onFilterChange({ ...filters, dateFilter: 'all', customStartDate: '', customEndDate: '' })}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Clear All Link */}
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline ml-1.5"
            >
              Limpar todos
            </button>
          </div>
        )}

        {/* EXPANDED DETAILED FILTERS DRAWER */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
            
            {/* 1. Filter by Company (Empresa) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                Empresa:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {availableCompanies.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">Nenhuma empresa cadastrada ainda</span>
                ) : (
                  availableCompanies.map((comp) => {
                    const isSelected = filters.companies.includes(comp);
                    const count = companyCounts[comp] || 0;
                    return (
                      <button
                        key={comp}
                        id={`filter-company-${comp.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => toggleCompany(comp)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700 font-semibold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span>{comp}</span>
                        {count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Filter by Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                Status:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {statusOptions.map((st) => {
                  const isSelected = filters.statuses.includes(st.value);
                  const Icon = st.icon;
                  const count = statusCounts[st.value] || 0;
                  return (
                    <button
                      key={st.value}
                      id={`filter-status-${st.value}`}
                      onClick={() => toggleStatus(st.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                        isSelected
                          ? st.activeClass
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{st.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Filter by Chamado (Ticket) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <Ticket className="w-3.5 h-3.5 text-blue-500" />
                Chamado:
              </span>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] max-w-xs">
                  <input
                    type="text"
                    value={filters.ticketSearch}
                    onChange={handleTicketSearchChange}
                    placeholder="Filtrar por nº do chamado (ex: CHAM-8842)..."
                    className="w-full px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  {filters.ticketSearch && (
                    <button
                      onClick={() => onFilterChange({ ...filters, ticketSearch: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick ticket pills if available */}
                {availableTickets.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {availableTickets.slice(0, 5).map((tk) => {
                      const isSelected = filters.ticketSearch.toLowerCase() === tk.toLowerCase();
                      return (
                        <button
                          key={tk}
                          onClick={() => onFilterChange({ ...filters, ticketSearch: isSelected ? '' : tk })}
                          className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {tk}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Filter by Dynamic Period (Período Dinâmico / Range de Datas) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <CalendarRange className="w-3.5 h-3.5 text-blue-500" />
                Período:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {dateFilterOptions.map((opt) => {
                    const isSelected = filters.dateFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setDateFilter(opt.value)}
                        className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700 font-semibold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Range Inputs (Aparece se selecionado ou configurado) */}
                {filters.dateFilter === 'custom' && (
                  <div className="flex items-center gap-1.5 bg-blue-50/60 dark:bg-blue-950/40 p-1.5 rounded-lg border border-blue-200 dark:border-blue-800 animate-fadeIn">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">De:</span>
                    <input
                      type="date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => onFilterChange({ ...filters, customStartDate: e.target.value })}
                      className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">Até:</span>
                    <input
                      type="date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => onFilterChange({ ...filters, customEndDate: e.target.value })}
                      className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 5. Filter by Urgency */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                Urgência:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {urgencyOptions.map((opt) => {
                  const isSelected = filters.urgencies.includes(opt.value);
                  const count = urgencyCounts[opt.value] || 0;
                  return (
                    <button
                      key={opt.value}
                      id={`filter-urgency-${opt.value}`}
                      onClick={() => toggleUrgency(opt.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                        isSelected
                          ? opt.activeClass
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.color}`}></span>
                      {opt.label}
                      {count > 0 && (
                        <span className="text-[10px] opacity-75 font-bold">({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Filter by Assignee */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Responsável:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assignees.map((user) => {
                  const isSelected = filters.assigneeIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      id={`filter-assignee-${user.id}`}
                      onClick={() => toggleAssignee(user.id)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border transition-all ${
                        isSelected
                          ? 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700 font-semibold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${user.color}`}>
                          {user.initials}
                        </span>
                      )}
                      <span>{user.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. Filter by Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-[100px]">
                <TagIcon className="w-3.5 h-3.5 text-slate-400" />
                Tags:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {availableTags.map((tag) => {
                  const isSelected = filters.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      id={`filter-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8. Sorting controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Ordenar por:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="dueDate">Data de Entrega</option>
                  <option value="urgency">Nível de Urgência</option>
                  <option value="title">Título (A-Z)</option>
                  <option value="createdAt">Data de Criação</option>
                </select>

                <button
                  onClick={() => onFilterChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  {filters.sortOrder === 'asc' ? 'Crescente ↑' : 'Decrescente ↓'}
                </button>
              </div>

              {/* Counter summary */}
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{filteredTasksCount}</strong> de {totalTasksCount} tarefas
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
