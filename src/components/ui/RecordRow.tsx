import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CardImage } from '@/components/cards/CardImage';
import { cn } from '@/utils/cn';

export function RecordRow({
  href,
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  meta,
  aside,
  className,
}: {
  href: string;
  imageSrc: string | null;
  imageAlt: string;
  eyebrow: ReactNode;
  title: string;
  meta: ReactNode;
  aside: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        'surface-soft flex flex-col gap-4 p-3 transition-colors hover:border-line-strong sm:flex-row sm:items-center',
        className,
      )}
    >
      <Link
        to={href}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <CardImage
          src={imageSrc}
          alt={imageAlt}
          className="h-20 w-16 shrink-0 rounded-lg"
        />
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.5625rem] tracking-[0.12em] text-gold/80 uppercase">
            {eyebrow}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-chalk">
            {title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-mist-dim">
            {meta}
          </div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        {aside}
      </div>
    </li>
  );
}
