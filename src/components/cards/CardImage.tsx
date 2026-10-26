import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CardImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Card art is never cropped or stretched: the full card is contained inside
 * a 3:4 frame, with a branded fallback when the image is missing or broken.
 */
export function CardImage({
  src,
  alt,
  className,
  imageClassName,
  priority = false,
}: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showFallback = !src || failed;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-xl border border-line/80 bg-[radial-gradient(ellipse_at_center,#1b2430_0%,#0b0f15_75%)]',
        className,
      )}
    >
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full object-contain p-2 drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)] transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
        />
      )}
      {!showFallback && !loaded && (
        <div className="absolute inset-3 skeleton" aria-hidden="true" />
      )}
      {showFallback && (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface/80">
            <ImageOff aria-hidden="true" className="size-4 text-mist-dim" />
          </span>
          <span className="font-mono text-[0.625rem] tracking-[0.14em] text-mist-dim uppercase">
            Imagem indisponível
          </span>
        </div>
      )}
    </div>
  );
}
