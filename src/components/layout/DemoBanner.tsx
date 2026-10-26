import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { env } from '@/utils/env';
import { cn } from '@/utils/cn';

const STORAGE_KEY = 'aurebid.demoBanner.dismissed';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!env.useMocks || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Session storage may be unavailable; dismissal still works in memory.
    }
  };

  return (
    <div className="border-b border-gold/15 bg-gold/[0.055]">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6 lg:px-8">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-gold sm:mt-0" />
        <p className="flex-1 text-[0.6875rem] leading-relaxed text-mist sm:text-xs">
          <span className="font-medium text-gold-bright">Ambiente de demonstração.</span>{' '}
          Os dados vêm de mocks locais sobre o contrato real da API. Nenhuma
          operação financeira é real. Contas: bidder@aurebid.com / bidder123 ·
          auctioneer@aurebid.com / auctioneer123.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            '-m-1 rounded-md p-1.5 text-mist-dim transition-colors',
            'hover:bg-white/5 hover:text-chalk',
          )}
          aria-label="Ocultar aviso de demonstração"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
