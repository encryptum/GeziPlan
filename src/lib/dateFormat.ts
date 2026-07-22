export function parseTripDateTime(date: string, time = '08:00'): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatTimeTR(date: Date): string {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateLongTR(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShortTR(date: Date): string {
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function formatDateTimeRangeTR(start: Date, end?: Date): string {
  if (!end) return formatTimeTR(start);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${formatTimeTR(start)} – ${formatTimeTR(end)}`;
  return `${formatDateShortTR(start)} ${formatTimeTR(start)} – ${formatDateShortTR(end)} ${formatTimeTR(end)}`;
}

export function formatDurationHuman(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours === 0 && mins === 0) return `${days} gece`;
    return mins > 0 ? `${days} gece ${remHours} sa ${mins} dk` : `${days} gece ${remHours} sa`;
  }
  return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
}
