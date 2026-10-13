// Dates locales au format AAAA-MM-JJ.

let fixedToday: string | null = null;
/** Pour les tests : fixer la date du jour. */
export function setToday(d: string | null) {
  fixedToday = d;
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return fixedToday ?? dateKey(new Date());
}

export function parseDate(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseDate(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
}

export function weekday(k: string): number {
  return parseDate(k).getDay();
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function formatDate(k: string, withDay = true): string {
  const d = parseDate(k);
  return `${withDay ? DAYS[d.getDay()] + ' ' : ''}${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function shortDay(k: string): string {
  return DAYS[parseDate(k).getDay()].slice(0, 3);
}

export const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
