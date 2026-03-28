import { useState, useEffect, useCallback } from 'react';

/**
 * Polls the local Express server health endpoint.
 * Returns online status for UI indicators.
 */
export function useServerStatus(interval = 30000) {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
      setOnline(res.ok);
    } catch {
      setOnline(false);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, interval);
    return () => clearInterval(id);
  }, [check, interval]);

  return { online, checking };
}
