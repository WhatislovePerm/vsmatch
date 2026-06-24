import type { Court } from '../types';

const COURT_PREFIX_RE = /^площадка\s+на\s+/i;

export function cleanCourtName(name: string): string {
  return name.replace(COURT_PREFIX_RE, '').trim();
}

export function courtTitle(court: Court): string {
  return cleanCourtName(court.address || court.name);
}

export function courtAddressLine(court: Court): string | null {
  if (!court.address) return null;
  const title = courtTitle(court).toLocaleLowerCase('ru-RU');
  const address = cleanCourtName(court.address);
  return address.toLocaleLowerCase('ru-RU') === title ? null : address;
}
