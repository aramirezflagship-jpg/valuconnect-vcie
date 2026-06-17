import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * FaceSlotEditor — lets an admin define the face slot for a CHARACTER template.
 *
 * The admin sees the uploaded artwork at its intrinsic resolution (e.g. 1200×1800,
 * which equals the output canvas). They drag a rectangle over the face hole. We
 * convert the on-screen rectangle to ABSOLUTE pixels on the artwork's own canvas
 * (top-left origin) and report it via onChange as { x, y, width, height, shape }.
 *
 * They can also fine-tune via numeric inputs and toggle oval/rect.
 *
 * @param {{
 *   src: string,                    // object URL of the uploaded artwork
 *   value: {x,y,width,height,shape}|null,
 *   onChange: (slot|null) => void,
 * }} props
 */
export default function FaceSlotEditor({ src, value, onChange }) {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const [natural, setNatural] = useState(null); // { w, h } intrinsic artwork size
  const [drag, setDrag] = useState(null);        // { startX, startY } in natural px
  const shape = value?.shape || 'oval';

  // Capture intrinsic size once the image loads.
  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (img) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Convert a pointer event to natural (artwork) pixel coordinates.
  const toNatural = useCallback((e) => {
    const img = imgRef.current;
    if (!img || !natural) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = natural.w / rect.width;
    const scaleY = natural.h / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return {
      x: Math.max(0, Math.min(natural.w, x)),
      y: Math.max(0, Math.min(natural.h, y)),
    };
  }, [natural]);

  const onPointerDown = useCallback((e) => {
    const p = toNatural(e);
    if (!p) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ startX: p.x, startY: p.y });
    onChange({ x: Math.round(p.x), y: Math.round(p.y), width: 0, height: 0, shape });
  }, [toNatural, onChange, shape]);

  const onPointerMove = useCallback((e) => {
    if (!drag) return;
    const p = toNatural(e);
    if (!p) return;
    const x = Math.min(drag.startX, p.x);
    const y = Math.min(drag.startY, p.y);
    const width = Math.abs(p.x - drag.startX);
    const height = Math.abs(p.y - drag.startY);
    onChange({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), shape });
  }, [drag, toNatural, onChange, shape]);

  const onPointerUp = useCallback(() => setDrag(null), []);

  // Numeric field editing.
  const setField = (key, raw) => {
    const num = Math.max(0, Math.round(Number(raw) || 0));
    onChange({ ...(value || { x: 0, y: 0, width: 0, height: 0, shape }), [key]: num, shape });
  };
  const setShape = (s) => onChange({ ...(value || { x: 0, y: 0, width: 0, height: 0 }), shape: s });

  // Overlay rectangle positioned in % of the displayed image.
  const overlayStyle = (() => {
    if (!value || !natural || !value.width || !value.height) return null;
    return {
      position: 'absolute',
      left: `${(value.x / natural.w) * 100}%`,
      top: `${(value.y / natural.h) * 100}%`,
      width: `${(value.width / natural.w) * 100}%`,
      height: `${(value.height / natural.h) * 100}%`,
      border: '2px solid #4a8fc4',
      background: 'rgba(74,143,196,0.22)',
      borderRadius: shape === 'oval' ? '50%' : 6,
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
    };
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
      <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: 0 }}>
        Drag a box over the face hole. Coordinates are in artwork pixels
        {natural ? ` (${natural.w}×${natural.h})` : ''}.
      </p>

      <div
        ref={wrapRef}
        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', touchAction: 'none', userSelect: 'none', cursor: 'crosshair', maxWidth: 360 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt="artwork"
          onLoad={handleImgLoad}
          draggable={false}
          style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
        />
        {overlayStyle && <div style={overlayStyle} />}
      </div>

      {/* Shape toggle */}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        {['oval', 'rect'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setShape(s)}
            style={{
              flex: 1,
              background: shape === s ? 'var(--accent)' : 'var(--card-bg)',
              color: shape === s ? '#fff' : 'var(--text-muted)',
              border: shape === s ? 'none' : '1px solid var(--border)',
              borderRadius: 10,
              padding: '.5rem',
              fontSize: '.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s === 'oval' ? '⬭ Oval' : '▭ Rect'}
          </button>
        ))}
      </div>

      {/* Numeric inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.5rem' }}>
        {['x', 'y', 'width', 'height'].map((k) => (
          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', fontSize: '.7rem', color: 'var(--text-muted)' }}>
            {k}
            <input
              type="number"
              min="0"
              value={value?.[k] ?? ''}
              onChange={(e) => setField(k, e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '.4rem .5rem', color: 'var(--text)', fontSize: '.85rem', outline: 'none', width: '100%' }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
