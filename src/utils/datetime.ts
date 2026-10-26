export const DISPLAY_TIME_ZONE = 'America/Sao_Paulo';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? dateTimeFormatter.format(date) : '—';
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? dateFormatter.format(date) : '—';
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? timeFormatter.format(date) : '—';
}

export function formatShortDateTime(
  value: string | Date | null | undefined,
): string {
  const date = asDate(value);
  return date ? shortDateTimeFormatter.format(date) : '—';
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

export function countdownParts(target: string | Date | null | undefined, now = Date.now()): CountdownParts {
  const date = asDate(target);
  const totalMs = Math.max(0, (date?.getTime() ?? 0) - now);
  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    expired: totalMs <= 0,
  };
}

export function formatCountdown(parts: CountdownParts): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  if (parts.expired) return 'Encerrado';
  if (parts.days > 0) {
    return `${parts.days}d ${pad(parts.hours)}h ${pad(parts.minutes)}m`;
  }
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

export function formatCountdownCompact(parts: CountdownParts): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  if (parts.expired) return 'Encerrado';
  if (parts.days > 0) return `${parts.days}d ${pad(parts.hours)}h`;
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

/** Wall-clock parts in America/Sao_Paulo for datetime-local inputs. */
export function toZonedInputValue(value: string | Date | null | undefined): string {
  const date = asDate(value) ?? new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

function offsetAt(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  );

  return asUtc - date.getTime();
}

/** Converts an America/Sao_Paulo wall clock input into an ISO UTC string. */
export function zonedInputToIso(value: string): string | null {
  if (!value) return null;
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  let date = new Date(utcGuess - offsetAt(new Date(utcGuess)));
  const corrected = utcGuess - offsetAt(date);
  date = new Date(corrected);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function relativeToNow(value: string | Date | null | undefined): string {
  const date = asDate(value);
  if (!date) return '—';
  const diffMs = date.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  const future = diffMs > 0;

  if (absMinutes < 1) return 'agora';
  if (absMinutes < 60) return future ? `em ${absMinutes} min` : `há ${absMinutes} min`;

  const hours = Math.round(absMinutes / 60);
  if (hours < 24) return future ? `em ${hours} h` : `há ${hours} h`;

  const days = Math.round(hours / 24);
  return future ? `em ${days} d` : `há ${days} d`;
}
