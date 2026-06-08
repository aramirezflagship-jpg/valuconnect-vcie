import { useState, useEffect } from 'react';

/**
 * Hook that tracks the browser's online/offline status.
 *
 * @returns {{ isOnline: boolean, wasOffline: boolean }}
 *   - isOnline:   current network state
 *   - wasOffline: true if the connection dropped at any point this session
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  // wasOffline latches true the first time we go offline and stays true
  const [wasOffline, setWasOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // wasOffline is intentionally NOT reset — it's a session-level latch
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
