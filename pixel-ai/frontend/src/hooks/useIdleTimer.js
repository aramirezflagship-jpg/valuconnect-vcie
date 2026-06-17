import { useEffect, useRef, useCallback } from 'react';

/**
 * useIdleTimer — calls onIdle() after delayMs of inactivity.
 * Listens to touchstart, mousemove, keydown, and pointerdown events.
 *
 * @param {() => void} onIdle   - callback invoked when idle timer fires
 * @param {number}     delayMs  - idle timeout in milliseconds (default 30s)
 * @returns {{ reset: () => void }}
 */
export function useIdleTimer(onIdle, delayMs = 30000) {
  const timerRef = useRef(null);
  const onIdleRef = useRef(onIdle);

  // Keep the callback ref up-to-date so callers can change it without re-subscribing
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onIdleRef.current?.();
    }, delayMs);
  }, [delayMs]);

  useEffect(() => {
    const EVENTS = ['touchstart', 'mousemove', 'keydown', 'pointerdown'];

    const handleActivity = () => reset();

    EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    // Kick off the initial timer
    reset();

    return () => {
      clearTimeout(timerRef.current);
      EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [reset]);

  return { reset };
}
