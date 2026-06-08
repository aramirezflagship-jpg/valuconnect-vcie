import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Welcome from './components/Welcome.jsx';
import ThemePicker from './components/ThemePicker.jsx';
import Camera from './components/Camera.jsx';
import Processing from './components/Processing.jsx';
import Preview from './components/Preview.jsx';
import Delivery from './components/Delivery.jsx';
import { getEventConfig, uploadCapture, pollJobStatus } from './utils/api.js';
import useNetworkStatus from './hooks/useNetworkStatus.js';
import useOfflineQueue from './hooks/useOfflineQueue.js';
import { processQueue } from './utils/retry.js';

// ─── Default event config (fallback when no ?event= param) ───────────────────
const DEFAULT_CONFIG = {
  eventId: 'demo',
  name: 'Pixel AI Demo',
  lang: 'es',
  logoUrl: null,
  themes: null, // null = use built-in defaults from ThemePicker
  primaryColor: '#7c3aed',
};

// ─── Screen transition variants ──────────────────────────────────────────────
const screenVariants = {
  enter: { opacity: 0, scale: 0.97 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function App() {
  // ── Screen state machine ──────────────────────────────────────────────────
  const [screen, setScreen] = useState('welcome');
  // 'welcome' | 'theme-picker' | 'camera' | 'processing' | 'preview' | 'delivery'

  // ── Event config ──────────────────────────────────────────────────────────
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);

  // ── Session data ──────────────────────────────────────────────────────────
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const jobIdRef = useRef(null);

  // ── Language (derived from config) ───────────────────────────────────────
  const lang = config.lang || 'es';

  // ── Offline queue ─────────────────────────────────────────────────────────
  const { isOnline, wasOffline } = useNetworkStatus();
  const { queue, queueSize, addToQueue, removeFromQueue } = useOfflineQueue();
  const [processingOfflineQueue, setProcessingOfflineQueue] = useState(false);

  // Auto-process queue when signal returns
  useEffect(() => {
    if (!isOnline || !wasOffline || queueSize === 0 || processingOfflineQueue) return;
    setProcessingOfflineQueue(true);
    processQueue(
      queue,
      (item) => uploadCapture(item.blob, item.eventId, item.themeId),
      (item) => removeFromQueue(item.id),
      (item) => removeFromQueue(item.id) // leave failed items removed — they showed error
    ).finally(() => setProcessingOfflineQueue(false));
  }, [isOnline, wasOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load event config on mount ───────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');

    if (!eventId) return; // use DEFAULT_CONFIG

    setConfigLoading(true);
    getEventConfig(eventId)
      .then((data) => {
        // null means demo mode — backend unreachable, use defaults
        setConfig({ ...DEFAULT_CONFIG, ...(data || {}), eventId });
      })
      .catch((err) => {
        console.warn('[App] Could not load event config, using defaults.', err);
        setConfig({ ...DEFAULT_CONFIG, eventId });
      })
      .finally(() => setConfigLoading(false));
  }, []);

  // ─── Reset session to welcome ─────────────────────────────────────────────
  const resetToWelcome = useCallback(() => {
    setScreen('welcome');
    setSelectedTheme(null);
    setCapturedBlob(null);
    setResultUrl(null);
    setProcessingError(null);
    jobIdRef.current = null;
  }, []);

  // ─── Navigation handlers ──────────────────────────────────────────────────
  const goToThemePicker = useCallback(() => setScreen('theme-picker'), []);

  const goToCamera = useCallback((theme) => {
    setSelectedTheme(theme);
    setScreen('camera');
  }, []);

  const handleCapture = useCallback(
    async (blob) => {
      setCapturedBlob(blob);
      setProcessingError(null);
      setScreen('processing');

      try {
        const result = await uploadCapture(blob, config.eventId, selectedTheme?.id || 'galaxy');

        // If the API returns a direct result URL, skip polling
        if (result.resultUrl) {
          setResultUrl(result.resultUrl);
          if (result.demo) setProcessingError('demo');
          setScreen('preview');
          return;
        }

        // Otherwise poll for job completion
        if (result.statusUrl || result.jobId) {
          const statusUrl = result.statusUrl || `/api/jobs/${result.jobId}`;
          const done = await pollJobStatus(statusUrl);
          setResultUrl(done.resultUrl);
          setScreen('preview');
        } else {
          throw new Error('No resultUrl or statusUrl in API response');
        }
      } catch (err) {
        // Network failure → queue for retry when signal returns
        const isNetworkErr = !err.response && err.request != null;
        if (isNetworkErr && blob) {
          await addToQueue(blob, config.eventId, selectedTheme?.id || 'galaxy');
          setProcessingError('queued');
        } else {
          setProcessingError(err.message || 'Processing failed');
        }
        console.error('[App] Processing error:', err);
        setScreen('preview');
      }
    },
    [config.eventId, selectedTheme]
  );

  const handleApprove = useCallback(() => {
    setScreen('delivery');
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedBlob(null);
    setResultUrl(null);
    setProcessingError(null);
    setScreen('camera');
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (configLoading) {
    return (
      <div className="screen" style={{ background: 'var(--bg)' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '4px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Offline / queued banner */}
      {(queueSize > 0 || processingOfflineQueue) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: processingOfflineQueue ? 'var(--success)' : '#b45309',
          color: '#fff', textAlign: 'center', padding: '8px 16px',
          fontSize: '0.85rem', fontWeight: 600,
        }}>
          {processingOfflineQueue
            ? (lang === 'es' ? '📶 Subiendo fotos en cola...' : '📶 Uploading queued photos...')
            : (lang === 'es'
                ? `📵 ${queueSize} foto${queueSize > 1 ? 's' : ''} en cola — esperando señal`
                : `📵 ${queueSize} photo${queueSize > 1 ? 's' : ''} queued — waiting for signal`)}
        </div>
      )}
    <AnimatePresence mode="wait">
      {screen === 'welcome' && (
        <motion.div
          key="welcome"
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'fixed', inset: 0 }}
        >
          <Welcome config={config} lang={lang} onStart={goToThemePicker} />
        </motion.div>
      )}

      {screen === 'theme-picker' && (
        <motion.div
          key="theme-picker"
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'fixed', inset: 0 }}
        >
          <ThemePicker config={config} lang={lang} onSelect={goToCamera} onBack={resetToWelcome} />
        </motion.div>
      )}

      {screen === 'camera' && (
        <motion.div
          key="camera"
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'fixed', inset: 0 }}
        >
          <Camera lang={lang} onCapture={handleCapture} onBack={() => setScreen('theme-picker')} />
        </motion.div>
      )}

      {screen === 'processing' && (
        <motion.div
          key="processing"
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'fixed', inset: 0 }}
        >
          <Processing lang={lang} />
        </motion.div>
      )}

      {screen === 'preview' && (
        <motion.div
          key="preview"
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'fixed', inset: 0 }}
        >
          <Preview
            lang={lang}
            imageUrl={resultUrl}
            error={processingError}
            onApprove={handleApprove}
            onRetake={handleRetake}
          />
        </motion.div>
      )}

      {screen === 'delivery' && (
        <motion.div
          key="delivery"
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'fixed', inset: 0 }}
        >
          <Delivery
            lang={lang}
            config={config}
            photoUrl={resultUrl}
            onNewPhoto={resetToWelcome}
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
