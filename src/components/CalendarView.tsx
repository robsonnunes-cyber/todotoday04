import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  User
} from 'lucide-react';
import { Task, TaskStatus, TaskUrgency } from '../types';
import { formatBRDateWithWeekday, formatToBRDate } from '../utils/dateUtils';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddNewTaskWithDate: (dateStr: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onEditTask,
  onAddNewTaskWithDate,
  onStatusChange,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = prevDate.toISOString().split('T')[0];
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = d.toISOString().split('T')[0];
    calendarCells.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Next month padding days to fill 35 or 42 grid
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    const dateStr = nextDate.toISOString().split('T')[0];
    calendarCells.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const getUrgencyColor = (urgency: TaskUrgency) => {
    switch (urgency) {
      case 'urgent': return 'bg-rose-500 text-white';
      case 'high': return 'bg-amber-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-emerald-500 text-white';
    }
  };

  // Selected day tasks
  const selectedDayTasks = tasks.filter(t => t.dueDate === selectedDate);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
              {monthNames[month]} de {year}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualização de entregas e cronograma de tarefas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Grid & Side Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Calendar Grid (3 cols on desktop) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center py-2.5">
            {weekDayNames.map((d, index) => (
              <div
                key={d}
                className={`text-xs font-bold uppercase tracking-wider ${
                  index === 0 || index === 6 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {calendarCells.map((cell) => {
              const dayTasks = tasks.filter(t => t.dueDate === cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600'
                      : 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
                  } ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-blue-500 inset-0 z-10'
                      : ''
                  }`}
                >
                  {/* Top Day Number & Add task shortcut */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white font-bold'
                          : isSelected
                          ? 'bg-slate-200 dark:bg-slate-700 text-blue-600 dark:text-blue-300'
                          : cell.isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNewTaskWithDate(cell.dateStr);
                      }}
                      title={`Nova tarefa para ${cell.dateStr}`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-opacity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Day Tasks Badges */}
                  <div className="mt-1 space-y-1 overflow-hidden flex-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task);
                        }}
                        title={task.title}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded-md font-medium transition-transform hover:scale-[1.02] flex items-center gap-1 ${
                          task.status === 'done'
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 line-through'
                            : task.urgency === 'urgent'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold'
                            : task.urgency === 'high'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getUrgencyColor(task.urgency)}`}></span>
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}

                    {dayTasks.length > 3 && (
                      <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 pl-1">
                        +{dayTasks.length - 3} mais...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Selected Date Detail Side Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Dia Selecionado
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {formatBRDateWithWeekday(selectedDate) || formatToBRDate(selectedDate)}
              </h3>
            </div>

            <button
              onClick={() => onAddNewTaskWithDate(selectedDate)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova</span>
            </button>
          </div>

          {/* List of tasks for this specific day */}
          <div className="flex-1 overflow-y-auto space-y-2.5">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {task.status === 'done' ? 'Concluída' : task.status === 'in_progress' ? 'Em Progresso' : 'A Fazer'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      task.urgency === 'urgent' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                      task.urgency === 'high' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {task.urgency}
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors ${
                    task.status === 'done' ? 'line-through text-slate-400' : ''
                  }`}>
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center -space-x-1">
                      {task.assignees?.map(u => (
                        <span key={u.id} className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-slate-900 overflow-hidden text-[9px] flex items-center justify-center font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {u.initials}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done');
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {task.status === 'done' ? 'Reabrir' : 'Concluir'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Nenhuma tarefa agendada para esta data.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
