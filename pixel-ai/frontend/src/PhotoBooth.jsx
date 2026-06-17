import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Welcome from './components/Welcome.jsx';
import ThemePicker from './components/ThemePicker.jsx';
import Camera from './components/Camera.jsx';
import Processing from './components/Processing.jsx';
import Preview from './components/Preview.jsx';
import AttractScreen from './components/AttractScreen.jsx';
import SharingMenu from './components/SharingMenu.jsx';
import GifCapture from './components/GifCapture.jsx';
import LayoutPicker from './components/LayoutPicker.jsx';
import StripPreview from './components/StripPreview.jsx';
import VideoCapture from './components/VideoCapture.jsx';
import { getEventConfig, uploadCapture, pollJobStatus } from './utils/api.js';
import useNetworkStatus from './hooks/useNetworkStatus.js';
import useOfflineQueue from './hooks/useOfflineQueue.js';
import { useIdleTimer } from './hooks/useIdleTimer.js';
import { processQueue } from './utils/retry.js';

// ─── Default event config (fallback when no ?event= param) ───────────────────
const DEFAULT_CONFIG = {
  eventId: 'demo',
  name: 'Flash-it Demo',
  lang: null,
  logoUrl: null,
  themes: null, // null = use built-in defaults from ThemePicker
  primaryColor: '#4a8fc4',
};

// ─── Screen transition variants ──────────────────────────────────────────────
const screenVariants = {
  enter: { opacity: 0, scale: 0.97 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 1.02, transition: { duration: 0.25, ease: 'easeIn' } },
};

/**
 * PhotoBooth — the core kiosk/guest experience.
 *
 * @param {{ eventCodeOverride?: string }} props
 *   eventCodeOverride: eventCode from /e/:eventCode URL param.
 *   When provided it takes precedence over the ?event= query param.
 */
export default function PhotoBooth({ eventCodeOverride }) {
  // ── Screen state machine ──────────────────────────────────────────────────
  // 'attract' | 'welcome' | 'theme-picker' | 'layout-picker' | 'camera'
  // | 'processing' | 'preview' | 'delivery' | 'gif-capture' | 'video-capture'
  // | 'strip-preview'
  const [screen, setScreen] = useState(eventCodeOverride ? 'attract' : 'welcome');

  // ── Event config ──────────────────────────────────────────────────────────
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);

  // ── Session data ──────────────────────────────────────────────────────────
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [processingError, setProcessingError] = useState(null);

  // ── New state for kiosk features ──────────────────────────────────────────
  const [captureMode, setCaptureMode] = useState('photo'); // 'photo' | 'gif' | 'video'
  const [selectedLayout, setSelectedLayout] = useState(null); // template object from LayoutPicker
  const [capturedFrames, setCapturedFrames] = useState([]); // { blob, resultUrl }[] for strip mode
  const [availableLayouts, setAvailableLayouts] = useState([]); // loaded from /api/templates

  const jobIdRef = useRef(null);
  const attractTimerRef = useRef(null);

  // ── Language — stateful so the in-booth toggle can flip it ──────────────────
  const [lang, setLang] = useState(() => config.lang || localStorage.getItem('flash_it_lang') || 'en');

  const handleLangChange = useCallback((l) => {
    setLang(l);
    localStorage.setItem('flash_it_lang', l);
  }, []);

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
      (item) => removeFromQueue(item.id)
    ).finally(() => setProcessingOfflineQueue(false));
  }, [isOnline, wasOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load event config on mount ───────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = eventCodeOverride || params.get('event');

    if (!eventId) return;

    setConfigLoading(true);
    getEventConfig(eventId)
      .then((data) => {
        setConfig({ ...DEFAULT_CONFIG, ...(data || {}), eventId });
      })
      .catch((err) => {
        console.warn('[PhotoBooth] Could not load event config, using defaults.', err);
        setConfig({ ...DEFAULT_CONFIG, eventId });
      })
      .finally(() => setConfigLoading(false));
  }, [eventCodeOverride]);

  // ─── Load available layouts after event config is ready ───────────────────
  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => setAvailableLayouts(data.templates || []))
      .catch(() => setAvailableLayouts([]));
  }, []);

  // ─── Reset session ────────────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setSelectedTheme(null);
    setCapturedBlob(null);
    setResultUrl(null);
    setGifUrl(null);
    setProcessingError(null);
    setCapturedFrames([]);
    setSelectedLayout(null);
    setCaptureMode('photo');
    jobIdRef.current = null;
  }, []);

  const resetToWelcome = useCallback(() => {
    resetState();
    setScreen('welcome');
  }, [resetState]);

  // ─── Auto-return to attract after session completes ───────────────────────
  const scheduleAttractReturn = useCallback(() => {
    if (!eventCodeOverride) return;
    clearTimeout(attractTimerRef.current);
    attractTimerRef.current = setTimeout(() => {
      resetState();
      setScreen('attract');
    }, 10000);
  }, [eventCodeOverride, resetState]);

  useEffect(() => () => clearTimeout(attractTimerRef.current), []);

  // ─── Idle timer: 30s of no interaction → attract/welcome ──────────────────
  useIdleTimer(() => {
    if (screen !== 'attract') {
      resetState();
      setScreen(eventCodeOverride ? 'attract' : 'welcome');
    }
  }, 30000);

  // ─── Navigation handlers ──────────────────────────────────────────────────
  const goToThemePicker = useCallback(() => setScreen('theme-picker'), []);

  const goToCamera = useCallback(
    (theme) => {
      setSelectedTheme(theme);
      if (availableLayouts.length > 1) {
        setScreen('layout-picker');
      } else {
        setSelectedLayout(availableLayouts[0] || null);
        setScreen('camera');
      }
    },
    [availableLayouts]
  );

  // ─── Handle mode change from CaptureSelector ─────────────────────────────
  const handleModeChange = useCallback(
    (newMode) => {
      setCaptureMode(newMode);
      if (newMode === 'gif') {
        setScreen('gif-capture');
      } else if (newMode === 'video') {
        setScreen('video-capture');
      }
      // 'photo' stays on 'camera'
    },
    []
  );

  // ─── Handle photo capture ─────────────────────────────────────────────────
  const handleCapture = useCallback(
    async (blob) => {
      const photoCount = selectedLayout?.photoCount || 1;

      if (photoCount > 1) {
        // Multi-photo strip mode
        setCapturedBlob(blob);
        setProcessingError(null);
        setScreen('processing');

        try {
          const result = await uploadCapture(blob, config.eventId, selectedTheme?.id || 'galaxy');

          let url = result.resultUrl;
          if (!url) {
            if (result.statusUrl || result.jobId) {
              const statusUrl = result.statusUrl || `/api/jobs/${result.jobId}`;
              const done = await pollJobStatus(statusUrl);
              url = done.resultUrl;
            }
          }
          if (!url) throw new Error('No result URL');

          const newFrames = [...capturedFrames, { blob, resultUrl: url }];
          setCapturedFrames(newFrames);

          if (newFrames.length < photoCount) {
            // Need more photos — back to camera with frame counter
            setScreen('camera');
          } else {
            // All photos collected — compose strip
            const token = localStorage.getItem('flash_it_token') || '';
            const stripRes = await fetch('/api/strips/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                eventId: config.eventId,
                photoUrls: newFrames.map((f) => f.resultUrl),
                templateId: selectedLayout.id,
              }),
            });
            const stripData = await stripRes.json();
            if (!stripRes.ok) throw new Error(stripData.error || 'Strip creation failed');
            setResultUrl(stripData.stripUrl);
            setCapturedFrames([]);
            setScreen('strip-preview');
          }
        } catch (err) {
          setProcessingError(err.message);
          setScreen('preview');
        }
        return;
      }

      // ── Single photo — existing flow ──────────────────────────────────────
      setCapturedBlob(blob);
      setProcessingError(null);
      setScreen('processing');

      try {
        const result = await uploadCapture(blob, config.eventId, selectedTheme?.id || 'galaxy');

        if (result.resultUrl) {
          setResultUrl(result.resultUrl);
          if (result.demo) setProcessingError('demo');
          setScreen('preview');
          return;
        }

        if (result.statusUrl || result.jobId) {
          const statusUrl = result.statusUrl || `/api/jobs/${result.jobId}`;
          const done = await pollJobStatus(statusUrl);
          setResultUrl(done.resultUrl);
          setScreen('preview');
        } else {
          throw new Error('No resultUrl or statusUrl in API response');
        }
      } catch (err) {
        const isNetworkErr = !err.response && err.request != null;
        if (isNetworkErr && blob) {
          await addToQueue(blob, config.eventId, selectedTheme?.id || 'galaxy');
          setProcessingError('queued');
        } else {
          setProcessingError(err.message || 'Processing failed');
        }
        console.error('[PhotoBooth] Processing error:', err);
        setScreen('preview');
      }
    },
    [config.eventId, selectedTheme, selectedLayout, capturedFrames, addToQueue, pollJobStatus]
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
      {/* Attract screen — rendered outside AnimatePresence to cover everything */}
      {screen === 'attract' && (
        <AttractScreen
          onStart={() => setScreen('welcome')}
          eventName={config.name}
          lang={lang}
        />
      )}

      {/* GIF Capture — full-screen takeover, handles its own camera */}
      {screen === 'gif-capture' && (
        <GifCapture
          eventId={config.eventId}
          onGifReady={(url) => {
            setGifUrl(url);
            setResultUrl(url);
            setScreen('delivery');
          }}
          onCancel={() => {
            setCaptureMode('photo');
            setScreen('camera');
          }}
        />
      )}

      {/* Video Capture — full-screen takeover */}
      {screen === 'video-capture' && (
        <VideoCapture
          eventId={config.eventId}
          eventName={config.name}
          onVideoReady={({ videoUrl, duration }) => {
            setResultUrl(videoUrl);
            setScreen('delivery');
          }}
          onCancel={() => {
            setCaptureMode('photo');
            setScreen('camera');
          }}
        />
      )}

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
            <Welcome config={config} lang={lang} onLangChange={handleLangChange} onStart={goToThemePicker} />
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

        {screen === 'layout-picker' && (
          <motion.div
            key="layout-picker"
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ position: 'fixed', inset: 0 }}
          >
            <LayoutPicker
              layouts={availableLayouts}
              onSelect={(template) => {
                setSelectedLayout(template);
                setScreen('camera');
              }}
              onBack={() => setScreen('theme-picker')}
            />
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
            <Camera
              lang={lang}
              onCapture={handleCapture}
              onBack={() => setScreen(availableLayouts.length > 1 ? 'layout-picker' : 'theme-picker')}
              captureMode={captureMode}
              onModeChange={handleModeChange}
              photoCount={selectedLayout?.photoCount || 1}
              frameIndex={capturedFrames.length}
            />
            {/* GIF Mode button (legacy quick-switch) — only shown when not in strip mode */}
            {(!selectedLayout || selectedLayout.photoCount === 1) && (
              <button
                onClick={() => handleModeChange('gif')}
                style={{
                  position: 'absolute', top: '1rem', right: '1rem', zIndex: 100,
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '.45rem .9rem', fontSize: '.78rem', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 0 16px rgba(124,58,237,0.4)',
                }}
              >
                GIF Mode ✨
              </button>
            )}
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

        {screen === 'strip-preview' && (
          <motion.div
            key="strip-preview"
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ position: 'fixed', inset: 0 }}
          >
            <StripPreview
              stripUrl={resultUrl}
              templateId={selectedLayout?.id}
              onApprove={handleApprove}
              onRetake={() => {
                setCapturedFrames([]);
                setResultUrl(null);
                setScreen('camera');
              }}
              onDone={() => {
                scheduleAttractReturn();
                resetState();
                setScreen(eventCodeOverride ? 'attract' : 'welcome');
              }}
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
            style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }}
          >
            <SharingMenu
              photoUrl={resultUrl}
              gifUrl={gifUrl}
              eventName={config.name}
              eventId={config.eventId}
              onDone={() => {
                scheduleAttractReturn();
                resetState();
                setScreen(eventCodeOverride ? 'attract' : 'welcome');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
