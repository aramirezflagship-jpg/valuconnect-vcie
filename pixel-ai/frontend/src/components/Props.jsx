import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Props — digital props with face detection via @vladmandic/face-api.
 *
 * Props (component props):
 *   videoRef   {React.RefObject}  - live video element
 *   canvasRef  {React.RefObject}  - overlay canvas (same size as video, absolute, pointer-events:none)
 *   active     {boolean}          - whether props are enabled
 *   onToggle   {function}         - toggles props on/off
 */

const PROP_OPTIONS = [
  { id: 'none',       emoji: '🚫', label: 'None'      },
  { id: 'hat',        emoji: '🎩', label: 'Top Hat'   },
  { id: 'sunglasses', emoji: '🕶️', label: 'Shades'    },
  { id: 'crown',      emoji: '👑', label: 'Crown'     },
  { id: 'bunny',      emoji: '🐰', label: 'Bunny'     },
  { id: 'hearts',     emoji: '❤️', label: 'Hearts'    },
];

export default function Props({ videoRef, canvasRef, active, onToggle }) {
  const [selectedProp, setSelectedProp] = useState('none');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const rafRef = useRef(null);
  const loadedOnce = useRef(false);

  // ── Load face-api models once when active first becomes true ──────────────
  useEffect(() => {
    if (!active || loadedOnce.current) return;
    loadedOnce.current = true;

    (async () => {
      try {
        const faceapi = await import('@vladmandic/face-api');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (err) {
        console.warn('[Props] face-api model loading failed — using fixed positions.', err);
        setModelError(true);
        setModelsLoaded(true); // allow fallback rendering
      }
    })();
  }, [active]);

  // ── Detection & drawing loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!active || !modelsLoaded || selectedProp === 'none') {
      // Clear canvas if we stop
      const canvas = canvasRef?.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let cancelled = false;

    async function loop() {
      if (cancelled) return;

      const video = videoRef?.current;
      const canvas = canvasRef?.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Match canvas size to video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || canvas.offsetWidth;
        canvas.height = video.videoHeight || canvas.offsetHeight;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!modelError) {
        try {
          const faceapi = await import('@vladmandic/face-api');
          const result = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true); // true = use tiny model

          if (result) {
            drawProp(ctx, selectedProp, result, canvas.width, canvas.height, false);
          } else {
            // No face detected — draw at fallback center
            drawPropFallback(ctx, selectedProp, canvas.width, canvas.height);
          }
        } catch {
          drawPropFallback(ctx, selectedProp, canvas.width, canvas.height);
        }
      } else {
        // Model failed — always use fallback
        drawPropFallback(ctx, selectedProp, canvas.width, canvas.height);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // Clear canvas on unmount
      const canvas = canvasRef?.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [active, modelsLoaded, selectedProp, modelError, videoRef, canvasRef]);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 12,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {PROP_OPTIONS.map((p) => (
        <button
          key={p.id}
          onPointerDown={() => setSelectedProp(p.id)}
          title={p.label}
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            border: selectedProp === p.id
              ? '2px solid #7c3aed'
              : '2px solid rgba(255,255,255,0.15)',
            background: selectedProp === p.id
              ? 'rgba(124,58,237,0.35)'
              : 'rgba(0,0,0,0.5)',
            fontSize: '1.6rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: selectedProp === p.id ? '0 0 12px rgba(124,58,237,0.6)' : 'none',
            transition: 'all .15s',
            backdropFilter: 'blur(6px)',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
        >
          {p.emoji}
        </button>
      ))}
    </div>
  );
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

/**
 * Draw a prop using face landmark positions.
 * Landmarks: faceapi landmark positions array (68 points).
 * Points reference: 0-16 jawline, 17-21 left brow, 22-26 right brow,
 *   27-30 nose bridge, 31-35 nose base, 36-41 left eye, 42-47 right eye,
 *   48-67 mouth.
 */
function drawProp(ctx, propId, result, cw, ch, mirrored) {
  const pts = result.landmarks.positions;

  switch (propId) {
    case 'hat': {
      // Top of forehead: midpoint between brow points 17-26, offset upward
      const leftBrow = pts[17];
      const rightBrow = pts[26];
      const midX = (leftBrow.x + rightBrow.x) / 2;
      const topY = Math.min(leftBrow.y, rightBrow.y) - 80;
      const hatW = (rightBrow.x - leftBrow.x) * 2.2;
      drawTopHat(ctx, midX, topY, hatW);
      break;
    }
    case 'sunglasses': {
      const leftEye = pts[36];
      const rightEye = pts[45];
      const midX = (leftEye.x + rightEye.x) / 2;
      const midY = (leftEye.y + rightEye.y) / 2;
      const glassW = Math.abs(rightEye.x - leftEye.x) * 2.5;
      drawSunglasses(ctx, midX, midY, glassW);
      break;
    }
    case 'crown': {
      const leftBrow = pts[17];
      const rightBrow = pts[26];
      const midX = (leftBrow.x + rightBrow.x) / 2;
      const topY = Math.min(leftBrow.y, rightBrow.y) - 100;
      const crownW = (rightBrow.x - leftBrow.x) * 2.4;
      drawCrown(ctx, midX, topY, crownW);
      break;
    }
    case 'bunny': {
      const leftBrow = pts[17];
      const rightBrow = pts[26];
      const midX = (leftBrow.x + rightBrow.x) / 2;
      const topY = Math.min(leftBrow.y, rightBrow.y) - 120;
      const earSpread = (rightBrow.x - leftBrow.x) * 1.5;
      drawBunnyEars(ctx, midX, topY, earSpread);
      break;
    }
    case 'hearts': {
      const leftEye = pts[36];
      const rightEye = pts[45];
      drawHeart(ctx, leftEye.x, leftEye.y, 40);
      drawHeart(ctx, rightEye.x, rightEye.y, 40);
      break;
    }
    default:
      break;
  }
}

/**
 * Fallback: draw props at approximate center-of-frame positions.
 */
function drawPropFallback(ctx, propId, cw, ch) {
  const cx = cw / 2;
  const cy = ch * 0.35; // guess upper face area

  switch (propId) {
    case 'hat':
      drawTopHat(ctx, cx, cy - 80, cw * 0.35);
      break;
    case 'sunglasses':
      drawSunglasses(ctx, cx, cy + 20, cw * 0.45);
      break;
    case 'crown':
      drawCrown(ctx, cx, cy - 90, cw * 0.38);
      break;
    case 'bunny':
      drawBunnyEars(ctx, cx, cy - 100, cw * 0.28);
      break;
    case 'hearts':
      drawHeart(ctx, cx - 60, cy + 20, 40);
      drawHeart(ctx, cx + 60, cy + 20, 40);
      break;
    default:
      break;
  }
}

// ── Shape drawing functions ───────────────────────────────────────────────────

function drawTopHat(ctx, cx, topY, width) {
  const brimH = width * 0.15;
  const crownH = width * 0.55;
  const crownW = width * 0.55;

  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;

  // Brim
  ctx.beginPath();
  ctx.ellipse(cx, topY + crownH, width / 2, brimH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crown
  ctx.beginPath();
  ctx.rect(cx - crownW / 2, topY, crownW, crownH);
  ctx.fill();
  ctx.stroke();

  // Hat band
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.rect(cx - crownW / 2, topY + crownH - 14, crownW, 10);
  ctx.fill();

  ctx.restore();
}

function drawSunglasses(ctx, cx, cy, width) {
  const lensW = width * 0.38;
  const lensH = lensW * 0.55;
  const gap = lensW * 0.08;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 3;

  // Left lens
  const lx = cx - gap / 2 - lensW;
  ctx.beginPath();
  ctx.ellipse(lx + lensW / 2, cy, lensW / 2, lensH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right lens
  const rx = cx + gap / 2;
  ctx.beginPath();
  ctx.ellipse(rx + lensW / 2, cy, lensW / 2, lensH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bridge
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx + lensW, cy);
  ctx.lineTo(rx, cy);
  ctx.stroke();

  // Tinted reflection highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(lx + lensW / 2 - 4, cy - 4, lensW * 0.18, lensH * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(rx + lensW / 2 - 4, cy - 4, lensW * 0.18, lensH * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCrown(ctx, cx, topY, width) {
  const h = width * 0.45;
  const points = [
    [cx - width / 2, topY + h],
    [cx - width / 2, topY + h * 0.5],
    [cx - width * 0.3, topY + h * 0.2],
    [cx - width * 0.1, topY + h * 0.5],
    [cx, topY],
    [cx + width * 0.1, topY + h * 0.5],
    [cx + width * 0.3, topY + h * 0.2],
    [cx + width / 2, topY + h * 0.5],
    [cx + width / 2, topY + h],
  ];

  ctx.save();
  ctx.fillStyle = '#f8b500';
  ctx.strokeStyle = '#c88f00';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jewels
  const jewels = [
    [cx, topY + 4],
    [cx - width * 0.3, topY + h * 0.25],
    [cx + width * 0.3, topY + h * 0.25],
  ];
  jewels.forEach(([jx, jy]) => {
    ctx.fillStyle = '#e040fb';
    ctx.beginPath();
    ctx.arc(jx, jy, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawBunnyEars(ctx, cx, topY, spread) {
  const earH = spread * 1.2;
  const earW = spread * 0.22;

  ctx.save();

  for (const side of [-1, 1]) {
    const ex = cx + side * spread * 0.4;

    // Outer ear
    ctx.fillStyle = '#f9a8d4';
    ctx.strokeStyle = '#e879aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ex, topY + earH / 2, earW / 2, earH / 2, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ear
    ctx.fillStyle = '#fce7f3';
    ctx.beginPath();
    ctx.ellipse(ex, topY + earH / 2 + earH * 0.05, earW * 0.42, earH * 0.42, side * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHeart(ctx, cx, cy, size) {
  ctx.save();
  ctx.fillStyle = 'rgba(239,68,68,0.9)';
  ctx.shadowColor = 'rgba(239,68,68,0.7)';
  ctx.shadowBlur = 8;

  const s = size / 30;
  ctx.beginPath();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-15, -20, -30, -5, 0, 15);
  ctx.bezierCurveTo(30, -5, 15, -20, 0, -8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
