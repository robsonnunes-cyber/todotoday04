/**
 * Utility functions for Brazilian Date Formatting (dd/mm/aaaa) and ISO Normalization
 */

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_FULL_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/**
 * Converts any date representation (DD/MM/YYYY, ISO string, Date object, timestamp, Excel number)
 * into canonical ISO format 'YYYY-MM-DD' for reliable internal state, HTML date inputs, and sorting.
 */
export function normalizeToISODate(dateVal: any): string {
  if (!dateVal) return '';

  // If Date object
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If numeric (timestamp or Excel serial number)
  if (typeof dateVal === 'number') {
    if (dateVal > 10000000000) {
      // Milliseconds timestamp
      return normalizeToISODate(new Date(dateVal));
    }
    // Excel serial number (1900 date system)
    const parsed = new Date((dateVal - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(parsed.getTime())) {
      return normalizeToISODate(parsed);
    }
  }

  const str = String(dateVal).trim();
  if (!str) return '';

  // Already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // ISO with timestamp (e.g. 2026-08-30T15:30:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.split('T')[0];
  }

  // Brazilian format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Brazilian format with 2-digit year: DD/MM/YY
  const brShortYearMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (brShortYearMatch) {
    const day = brShortYearMatch[1].padStart(2, '0');
    const month = brShortYearMatch[2].padStart(2, '0');
    const year = Number(brShortYearMatch[3]) < 50 ? `20${brShortYearMatch[3]}` : `19${brShortYearMatch[3]}`;
    return `${year}-${month}-${day}`;
  }

  // Fallback: standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Formats any date into Brazilian standard DD/MM/AAAA (ex: '30/08/2026')
 */
export function formatToBRDate(dateVal: any): string {
  const iso = normalizeToISODate(dateVal);
  if (!iso) return '';

  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formats any date into short Brazilian format DD/MM (ex: '30/08')
 */
export function formatBRDateShort(dateVal: any): string {
  const iso = normalizeToISODate(dateVal);
  if (!iso) return '';

  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/**
 * Formats any date with Day of Week in Portuguese (ex: 'Dom, 30/08/2026')
 */
export function formatBRDateWithWeekday(dateVal: any): string {
  const iso = normalizeToISODate(dateVal);
  if (!iso) return '';

  const [yearStr, monthStr, dayStr] = iso.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  const weekday = WEEKDAYS_SHORT_PT[d.getDay()] || '';

  return `${weekday}, ${dayStr}/${monthStr}/${yearStr}`;
}

/**
 * Formats any date into full written Portuguese (ex: '30 de Agosto de 2026')
 */
export function formatBRDateLong(dateVal: any): string {
  const iso = normalizeToISODate(dateVal);
  if (!iso) return '';

  const [yearStr, monthStr, dayStr] = iso.split('-');
  const monthName = MONTH_NAMES_PT[Number(monthStr) - 1] || '';

  return `${Number(dayStr)} de ${monthName} de ${yearStr}`;
}

/**
 * Comprehensive status and styling info for task due dates in Portuguese
 */
export function getDueDateStatus(dateVal: any, isDone = false): {
  formattedBR: string;
  formattedShort: string;
  formattedWithWeekday: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  badgeClass: string;
  statusLabel: string;
} {
  const iso = normalizeToISODate(dateVal);
  if (!iso) {
    return {
      formattedBR: '',
      formattedShort: '',
      formattedWithWeekday: '',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      badgeClass: 'text-slate-400 dark:text-slate-500',
      statusLabel: 'Sem prazo',
    };
  }

  const now = new Date();
  const todayISO = normalizeToISODate(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = normalizeToISODate(tomorrow);

  const formattedBR = formatToBRDate(iso);
  const formattedShort = formatBRDateShort(iso);
  const formattedWithWeekday = formatBRDateWithWeekday(iso);

  if (isDone) {
    return {
      formattedBR,
      formattedShort,
      formattedWithWeekday,
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      badgeClass: 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60',
      statusLabel: formattedBR,
    };
  }

  if (iso < todayISO) {
    return {
      formattedBR,
      formattedShort,
      formattedWithWeekday,
      isOverdue: true,
      isToday: false,
      isTomorrow: false,
      badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900 font-semibold',
      statusLabel: `${formattedBR} (Atrasada)`,
    };
  }

  if (iso === todayISO) {
    return {
      formattedBR,
      formattedShort,
      formattedWithWeekday,
      isOverdue: false,
      isToday: true,
      isTomorrow: false,
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-900 font-semibold',
      statusLabel: `Hoje (${formattedShort})`,
    };
  }

  if (iso === tomorrowISO) {
    return {
      formattedBR,
      formattedShort,
      formattedWithWeekday,
      isOverdue: false,
      isToday: false,
      isTomorrow: true,
      badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-900 font-medium',
      statusLabel: `Amanhã (${formattedShort})`,
    };
  }

  return {
    formattedBR,
    formattedShort,
    formattedWithWeekday,
    isOverdue: false,
    isToday: false,
    isTomorrow: false,
    badgeClass: 'text-slate-600 bg-slate-100/90 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60',
    statusLabel: formattedBR,
  };
}

/**
 * Calculates the next due date based on the chosen recurrence pattern.
 * If base date is empty, it uses today as the starting point.
 */
export function calculateNextDueDate(dateVal: any, recurrence: string = 'monthly'): string {
  const currentIso = normalizeToISODate(dateVal);
  let baseDate: Date;

  if (currentIso) {
    const [y, m, d] = currentIso.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  } else {
    baseDate = new Date();
  }

  const nextDate = new Date(baseDate);

  switch (recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly': {
      const originalDay = baseDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + 1);
      // If month rollover occurred (e.g. Jan 31 -> Mar 3)
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0); // clamp to last day of previous month (the intended month)
      }
      break;
    }
    case 'yearly': {
      const originalDay = baseDate.getDate();
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0);
      }
      break;
    }
    case 'single':
    default:
      return currentIso || normalizeToISODate(new Date());
  }

  return normalizeToISODate(nextDate);
}
