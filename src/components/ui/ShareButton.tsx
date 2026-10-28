import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function ShareButton({
  title,
  text,
  className,
}: {
  title?: string;
  text?: string;
  className?: string;
}) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      push({
        title: 'Link copiado',
        description: 'O endereço público está na área de transferência.',
        tone: 'success',
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      push({
        title: 'Não foi possível copiar',
        description: `Copie manualmente: ${url}`,
        tone: 'warning',
      });
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void share()}
      className={className}
      leftIcon={
        copied ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Share2 aria-hidden="true" className="size-3.5" />
        )
      }
    >
      {copied ? 'Copiado' : 'Compartilhar'}
    </Button>
  );
}
