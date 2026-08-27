const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDateShort(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  return `${day} ${month}`;
}

export function formatDateFull(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateWithWeekday(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const weekday = WEEKDAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  return `${weekday}, ${day} ${month}`;
}

export function formatTimeShort(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours.toString().padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
}

export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return `${formatDateShort(d)}, ${formatTimeShort(d)}`;
}

/**
 * Safely parses any date string, ISO date, month-year format ("December 2026"), or number into a valid Date object or null.
 * Never throws "Invalid time value".
 */
export function parseSafeDate(dateInput: string | number | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput !== 'string' && typeof dateInput !== 'number') return null;

  const str = String(dateInput).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'n/a') {
    return null;
  }

  // 1. Direct standard parse (ISO, YYYY-MM-DD, etc.)
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // 2. Format: "December 2026" or "Dec 2026"
  const monthYearMatch = str.match(/^([a-zA-Z]+)[,\s]+(\d{4})$/);
  if (monthYearMatch) {
    const d = new Date(`1 ${monthYearMatch[1]} ${monthYearMatch[2]}`);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // 3. Format: "MM/YYYY" or "MM-YYYY"
  const myMatch = str.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (myMatch) {
    const d = new Date(`${myMatch[2]}-${myMatch[1].padStart(2, '0')}-01`);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // 4. Format: Just year e.g. "2026"
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(`${yearMatch[1]}-12-31`);
  }

  // 5. Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  return null;
}
