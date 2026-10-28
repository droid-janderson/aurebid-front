import { useEffect, useState } from 'react';
import { countdownParts, type CountdownParts } from '@/utils/datetime';
import { serverNow } from '@/utils/server-clock';

export function useCountdown(
  target: string | null | undefined,
  enabled = true,
): CountdownParts {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    if (!enabled || !target) return;

    const interval = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(interval);
  }, [target, enabled]);

  return countdownParts(target, now);
}
