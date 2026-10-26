import { useEffect } from 'react';

const SUFFIX = 'AureBid';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} — Leilões de cartas Pokémon TCG`;
  }, [title]);
}
