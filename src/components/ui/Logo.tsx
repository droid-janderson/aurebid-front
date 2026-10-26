import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Símbolo AureBid"
      className={cn('size-9', className)}
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="12"
        fill="#0b0e13"
        stroke="rgba(215,179,106,0.35)"
      />
      <path d="M24 8.5 38 38h-6.6L24 20.3 16.6 38H10L24 8.5Z" fill="#D7B36A" />
      <path d="M24 25.2 30.4 38H17.6L24 25.2Z" fill="#F3D99A" />
      <circle cx="24" cy="41.6" r="1.6" fill="#D7B36A" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright"
      aria-label="AureBid — página inicial"
    >
      <BrandMark className="size-9 transition-transform duration-300 group-hover:-rotate-2" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.3rem] font-medium tracking-[-0.02em] text-chalk">
            Aure<span className="text-gold">Bid</span>
          </span>
          <span className="mt-1 font-mono text-[0.5rem] tracking-[0.28em] text-mist-dim uppercase">
            Casa de leilões
          </span>
        </span>
      )}
    </Link>
  );
}
