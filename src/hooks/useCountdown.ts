import { useEffect, useState } from 'react';
import { countdownParts, type CountdownParts } from '@/utils/datetime';

export function useCountdown(
  target: string | null | undefined,
  enabled = true,
): CountdownParts {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !target) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [target, enabled]);

  return countdownParts(target, now);
}
