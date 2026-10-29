export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesQuery(
  query: string,
  fields: Array<string | null | undefined>,
): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;

  return fields.some((field) => {
    if (!field) return false;
    return normalizeSearch(field).includes(normalized);
  });
}
