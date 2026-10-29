// Formatting is done by hand rather than with Intl so the output is identical
// on every Android version and Hermes build, regardless of installed locales.

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 24-hour time, e.g. "07:05" or "23:59". */
export function formatTime24(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatSeconds(date: Date): string {
  return pad2(date.getSeconds());
}

export function formatWeekday(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

/** e.g. "29 October 2026". */
export function formatLongDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Minutes after midnight as "HH:mm", e.g. 1320 -> "22:00". */
export function formatMinuteOfDay(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/** "14:30 – 15:15", or "All day". */
export function formatTimeRange(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return 'All day';
  if (start.getTime() === end.getTime()) return formatTime24(start);
  return `${formatTime24(start)} – ${formatTime24(end)}`;
}

/** Short relative duration until `target`, e.g. "in 5 min", "in 2 h 10 min". */
export function formatUntil(target: Date, now: Date): string {
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `in ${hours} h` : `in ${hours} h ${rest} min`;
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function dayDiff(date: Date, now: Date): number {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

/** "Today", "Tomorrow", "Yesterday" or e.g. "Fri 31 Oct". */
export function formatRelativeDay(date: Date, now: Date): string {
  const diff = dayDiff(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${SHORT_WEEKDAYS[date.getDay()]} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** e.g. "Today 18:00" or "Fri 31 Oct 09:30". */
export function formatDueDate(date: Date, now: Date): string {
  return `${formatRelativeDay(date, now)} ${formatTime24(date)}`;
}

/** "7:05" plus "PM" for the 12-hour clock. */
export function formatTime12(date: Date): { time: string; period: 'AM' | 'PM' } {
  const hours = date.getHours();
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return { time: `${h}:${pad2(date.getMinutes())}`, period: hours < 12 ? 'AM' : 'PM' };
}

/** Clock-face time in the user's chosen format; used for small times like overlays. */
export function formatClock(date: Date, format: '24h' | '12h'): string {
  if (format === '24h') return formatTime24(date);
  const { time, period } = formatTime12(date);
  return `${time} ${period}`;
}

export function formatWeekdayShort(date: Date): string {
  return WEEKDAYS[date.getDay()].slice(0, 3);
}
