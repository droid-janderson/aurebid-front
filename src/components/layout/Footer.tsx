import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-8" />
            <span className="font-display text-lg text-chalk">
              Aure<span className="text-gold">Bid</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist">
            Casa de leilões dedicada a cartas colecionáveis Pokémon TCG. Lotes
            autenticados por catálogo, lances auditáveis e liquidação
            transparente.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[0.625rem] tracking-[0.12em] text-mist-dim uppercase">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-win" />
            Histórico com cadeia de hashes
          </p>
        </div>

        <div>
          <h2 className="eyebrow">Leilão</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-mist">
            <li>
              <Link to="/" className="transition-colors hover:text-chalk">
                Vitrine de lotes
              </Link>
            </li>
            <li>
              <Link to="/arremates" className="transition-colors hover:text-chalk">
                Meus arremates
              </Link>
            </li>
            <li>
              <Link to="/carteira" className="transition-colors hover:text-chalk">
                Carteira
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">Leiloeiro</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-mist">
            <li>
              <Link to="/painel" className="transition-colors hover:text-chalk">
                Painel de lotes
              </Link>
            </li>
            <li>
              <Link
                to="/painel/lotes/novo"
                className="transition-colors hover:text-chalk"
              >
                Publicar lote
              </Link>
            </li>
            <li>
              <Link
                to="/painel/resultados"
                className="transition-colors hover:text-chalk"
              >
                Resultados
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">Conta</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-mist">
            <li>
              <Link to="/login" className="transition-colors hover:text-chalk">
                Entrar
              </Link>
            </li>
            <li>
              <Link to="/cadastro" className="transition-colors hover:text-chalk">
                Criar conta
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-mist-dim sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AureBid. Demonstração técnica.</p>
          <p>
            Valores, lances e liquidações exibidos seguem a fonte oficial do
            servidor.
          </p>
        </div>
      </div>
    </footer>
  );
}
