import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gavel, ShieldCheck, Timer } from 'lucide-react';
import { BrandMark } from '@/components/ui/Logo';

const highlights = [
  {
    icon: Gavel,
    title: 'Lances com reserva',
    description: 'Saldo disponível protegido a cada oferta.',
  },
  {
    icon: Timer,
    title: 'Relógio único',
    description: 'Encerramento validado pelo servidor.',
  },
  {
    icon: ShieldCheck,
    title: 'Trilha auditável',
    description: 'Sequência e hash em cada lance.',
  },
];

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-var(--header-height))] max-w-7xl lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line/70 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 hero-grid opacity-60" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-gold/[0.08] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[-4rem] bottom-[-6rem] size-[26rem] rounded-full border border-gold/10" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[2rem] bottom-[-2rem] size-[18rem] rounded-full border border-gold/[0.07]" aria-hidden="true" />

        <Link
          to="/"
          className="relative inline-flex items-center gap-2 text-xs font-medium text-mist transition-colors hover:text-chalk"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Voltar para a vitrine
        </Link>

        <div className="relative max-w-md">
          <BrandMark className="size-11" />
          <p className="eyebrow mt-8">AureBid · casa de leilões</p>
          <h2 className="display mt-3 text-[clamp(2.2rem,4vw,3.4rem)] text-chalk">
            A carta certa
            <br />
            <em>no lance certo.</em>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-mist">
            Uma casa dedicada a Pokémon TCG, com curadoria de catálogo e
            operações registradas de ponta a ponta.
          </p>
        </div>

        <ul className="relative grid gap-3">
          {highlights.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-ink/60">
                <item.icon aria-hidden="true" className="size-3.5 text-gold" />
              </span>
              <div>
                <p className="text-[0.8125rem] font-medium text-chalk">
                  {item.title}
                </p>
                <p className="text-xs text-mist-dim">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 text-xs text-mist transition-colors hover:text-chalk"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Vitrine
            </Link>
          </div>
          <p className="eyebrow">Acesso à casa</p>
          <h1 className="display mt-2 text-4xl text-chalk">{title}</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-mist">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-mist">{footer}</div>
        </div>
      </section>
    </div>
  );
}
