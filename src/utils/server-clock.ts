let offsetMs = 0;
let synced = false;

export function getServerOffsetMs(): number {
  return offsetMs;
}

export function isServerClockSynced(): boolean {
  return synced;
}

export function syncServerClock(serverTime: string | null | undefined): void {
  if (!serverTime) return;

  const parsed = Date.parse(serverTime);
  if (Number.isNaN(parsed)) return;

  offsetMs = parsed - Date.now();
  synced = true;
}

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function resetServerClock(): void {
  offsetMs = 0;
  synced = false;
}
