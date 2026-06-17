/**
 * CaptureSelector — mode picker shown at the top of the camera screen.
 *
 * Props:
 *   mode        {string}    - 'photo' | 'gif' | 'video'
 *   onChange    {function}  - called with new mode string
 *   photoCount  {number}    - number of photos in strip (>1 disables gif/video)
 */
export default function CaptureSelector({ mode, onChange, photoCount = 1 }) {
  const isStrip = photoCount > 1;

  const MODES = [
    { id: 'photo', icon: '📸', label: isStrip ? `×${photoCount} Strip` : 'Photo' },
    { id: 'gif',   icon: '🎞', label: 'GIF'   },
    { id: 'video', icon: '🎬', label: 'Video' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        padding: '8px 16px',
      }}
    >
      {MODES.map((m) => {
        const disabled = isStrip && m.id !== 'photo';
        const isActive = mode === m.id;

        return (
          <div
            key={m.id}
            style={{ position: 'relative' }}
            title={disabled ? 'Not available for strip layouts' : undefined}
          >
            <button
              onPointerDown={() => {
                if (!disabled) onChange(m.id);
              }}
              disabled={disabled}
              style={{
                minWidth: 80,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 12,
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                background: isActive
                  ? '#7c3aed'
                  : 'rgba(0,0,0,0.45)',
                color: isActive ? '#fff' : disabled ? '#475569' : '#94a3b8',
                fontSize: '.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '0 14px',
                opacity: disabled ? 0.45 : 1,
                transition: 'background .15s, color .15s',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                fontFamily: 'system-ui, sans-serif',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
