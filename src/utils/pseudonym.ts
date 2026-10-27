/** Stable, non-sensitive public label derived from an internal identifier. */
export function pseudonymFor(id: string, prefix = 'Licitante'): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const code = (hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-4);
  return `${prefix} ${code.slice(0, 2)}·${code.slice(2)}`;
}

export function publicBatchCode(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}
