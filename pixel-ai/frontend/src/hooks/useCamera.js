import { useEffect, useRef, useState } from 'react';

/**
 * useCamera — shared hook that manages a camera stream.
 *
 * @param {{ facingMode?: string, width?: number, height?: number }} opts
 * @returns {{ videoRef, streamRef, isReady, error, stopCamera }}
 */
export function useCamera({ facingMode = 'user', width = 1280, height = 960 } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

        setIsReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[useCamera] getUserMedia error:', err);
          setError(err.message || 'Camera unavailable');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsReady(false);
    };
  }, [facingMode, width, height]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  }

  return { videoRef, streamRef, isReady, error, stopCamera };
}
