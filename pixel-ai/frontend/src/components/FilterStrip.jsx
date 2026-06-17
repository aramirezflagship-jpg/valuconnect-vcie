import { useRef, useEffect, useState } from 'react';
import { FILTERS, getFilter } from '../utils/filters.js';

const THUMB_SIZE = 56;
const THUMB_INTERVAL_MS = 1500; // ~1 fps to avoid GPU thrash

/**
 * FilterStrip — horizontal scrolling row of filter thumbnails.
 *
 * Props:
 *   videoRef       {React.RefObject}  - live video element ref
 *   activeFilter   {string}           - currently selected filter id
 *   onFilterChange {function}         - called with new filter id
 *   beautyMode     {boolean}          - whether beauty mode is active
 *   onBeautyToggle {function}         - toggles beauty mode
 */
export default function FilterStrip({ videoRef, activeFilter, onFilterChange, beautyMode, onBeautyToggle }) {
  // One canvas ref per filter thumbnail
  const thumbRefs = useRef(FILTERS.map(() => ({ current: null })));
  const rafRef = useRef(null);
  const lastDrawRef = useRef(0);

  useEffect(() => {
    function draw(ts) {
      rafRef.current = requestAnimationFrame(draw);

      if (ts - lastDrawRef.current < THUMB_INTERVAL_MS) return;
      lastDrawRef.current = ts;

      const video = videoRef?.current;
      if (!video || video.readyState < 2) return;

      FILTERS.forEach((filter, i) => {
        const canvas = thumbRefs.current[i]?.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        // Apply filter to the small thumbnail via ctx.filter
        ctx.filter = filter.css || 'none';
        ctx.drawImage(video, 0, 0, THUMB_SIZE, THUMB_SIZE);
        ctx.filter = 'none';
      });
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 140,
        left: 0,
        right: 0,
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
      }}
    >
      {FILTERS.map((filter, i) => {
        // Ensure a stable ref object exists for each slot
        if (!thumbRefs.current[i]) thumbRefs.current[i] = { current: null };
        const isActive = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            onPointerDown={() => onFilterChange(filter.id)}
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              minWidth: 64,
              minHeight: 80,
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <div
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: 8,
                overflow: 'hidden',
                border: isActive ? '3px solid #7c3aed' : '3px solid rgba(255,255,255,0.2)',
                boxShadow: isActive ? '0 0 12px rgba(124,58,237,0.7)' : 'none',
                transition: 'border-color .15s, box-shadow .15s',
              }}
            >
              <canvas
                ref={(el) => { thumbRefs.current[i] = { current: el }; }}
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                style={{ display: 'block', width: THUMB_SIZE, height: THUMB_SIZE }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#a78bfa' : '#94a3b8',
                letterSpacing: '.02em',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {filter.label}
            </span>
          </button>
        );
      })}

      {/* Beauty toggle */}
      <button
        onPointerDown={onBeautyToggle}
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          minWidth: 64,
          minHeight: 80,
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
        }}
      >
        <div
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: beautyMode ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)',
            border: beautyMode ? '3px solid #7c3aed' : '3px solid rgba(255,255,255,0.2)',
            boxShadow: beautyMode ? '0 0 12px rgba(124,58,237,0.7)' : 'none',
            fontSize: '1.6rem',
            transition: 'all .15s',
          }}
        >
          ✨
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: beautyMode ? 700 : 500,
            color: beautyMode ? '#a78bfa' : '#94a3b8',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Beauty
        </span>
      </button>
    </div>
  );
}
