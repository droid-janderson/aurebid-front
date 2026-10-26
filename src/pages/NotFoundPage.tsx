import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Gavel, Search } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buttonStyles } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/Logo';

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada');

  return (
    <div className="mx-auto flex min-h-[68vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-10 rounded-full border border-gold/[0.07]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -inset-20 rounded-full border border-gold/[0.04]"
          aria-hidden="true"
        />
        <BrandMark className="relative size-12" />
      </div>

      <p className="eyebrow mt-8 flex items-center gap-2">
        <Compass aria-hidden="true" className="size-3.5" />
        Erro 404
      </p>
      <h1 className="display mt-3 text-[clamp(2.6rem,7vw,4.5rem)] text-chalk">
        Esta página
        <br />
        <em>saiu do catálogo.</em>
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
        O endereço não corresponde a um lote, recibo ou área da casa. Volte à
        vitrine para continuar acompanhando os leilões.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className={buttonStyles('primary', 'md')}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para a vitrine
        </Link>
        <Link to="/login" className={buttonStyles('secondary', 'md')}>
          <Gavel aria-hidden="true" className="size-4" />
          Entrar na conta
        </Link>
      </div>

      <p className="mt-8 flex items-center gap-1.5 text-[0.6875rem] text-mist-dim">
        <Search aria-hidden="true" className="size-3.5" />
        Procure pelo código do lote na vitrine, como #LOT-001.
      </p>
    </div>
  );
}
