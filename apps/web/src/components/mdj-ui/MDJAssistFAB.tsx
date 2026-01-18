'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_LOGO } from '@/contexts/BrandingContext';

interface MDJAssistFABProps {
  onClick?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  disabled?: boolean;
  badge?: number;
  status?: 'ok' | 'warn' | 'error';
  inline?: boolean; // render inline (no fixed positioning wrapper)
  sizePx?: number;  // overall button box (default 54 when floating, 36 inline)
  label?: string;
  showLabel?: boolean;
  online?: boolean | null;
  showTooltip?: boolean;
  tooltipText?: string;
}

export const MDJAssistFAB: React.FC<MDJAssistFABProps> = ({
  onClick,
  position = 'bottom-right',
  disabled = false,
  badge,
  status = 'ok',
  inline = false,
  sizePx,
  label = 'M Assist',
  showLabel = true,
  online = null,
  showTooltip = false,
  tooltipText = 'Ask M Assist',
}) => {
  const [hover, setHover] = useState(false);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const resolvedSize = typeof sizePx === 'number' ? sizePx : inline ? 44 : 66;
  const ringSize = inline ? resolvedSize - 8 : resolvedSize - 8;
  const posStyle: React.CSSProperties = inline
    ? {}
    : {
        position: 'fixed',
        zIndex: 9999,
        ...(position.includes('bottom') ? { bottom: '2rem' } : { top: '2rem' }),
        ...(position.includes('right') ? { right: '2rem' } : { left: '2rem' }),
      };

  const statusDotColor =
    online === true ? '#22c55e' : online === false ? '#ef4444' : '#9ca3af';

  return (
    <div
      style={{
        ...posStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {/* single, top-level styled-jsx block (no nesting) */}
      <style jsx global>{`
        @keyframes mdj-ring-spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>

      {showTooltip && !inline && (
        <div
          style={{
            position: 'absolute',
            right: resolvedSize + 16,
            bottom: resolvedSize + 8,
            background: 'rgba(17,24,39,0.95)',
            color: '#f9f9f9',
            padding: '8px 10px',
            borderRadius: 10,
            fontSize: 12,
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {tooltipText}
          <span
            style={{
              position: 'absolute',
              right: -6,
              bottom: 10,
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '6px solid rgba(17,24,39,0.95)',
            }}
          />
        </div>
      )}

      {showLabel && !inline && (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(17,24,39,0.9)',
            color: '#f9f9f9',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 8px 22px rgba(0,0,0,0.3)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusDotColor,
              boxShadow: `0 0 8px ${statusDotColor}80`,
            }}
          />
          <span>{label}</span>
        </div>
      )}

      <button
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={disabled}
        aria-label="Open M Assist"
        style={{
          pointerEvents: 'auto',
          position: 'relative',
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: 'none',
          transform: hover ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform .2s ease',
          outline: 'none',
        }}
      >
        {/* ring + logo (clean style) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {/* animated ring */}
          <div
            ref={ringRef}
            aria-hidden
            style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: '50%',
              border: `2px solid ${status === 'error' ? '#ef4444' : status === 'warn' ? '#eab308' : 'var(--brand-primary)'}`,
              boxShadow: 'none',
              // spin behavior: error = fast, warn = slow, ok = on-hover only
              animation:
                status === 'error'
                  ? 'mdj-ring-spin 1.2s linear infinite'
                  : status === 'warn'
                  ? 'mdj-ring-spin 3s linear infinite'
                  : hover
                  ? 'mdj-ring-spin 2.2s linear infinite'
                  : 'none',
              transition: 'border-color .2s ease',
            }}
          >
            {/* marker to make rotation visible */}
            <span
              style={{
                position: 'absolute',
                top: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: status === 'error' ? '#ef4444' : status === 'warn' ? '#eab308' : 'var(--brand-primary)',
                boxShadow: '0 0 6px rgba(0,0,0,0.25)',
              }}
            />
          </div>

          <img
            src={DEFAULT_LOGO}
            alt="M Assist Lion"
            style={{
              width: inline ? resolvedSize - 16 : 34,
              height: inline ? resolvedSize - 16 : 34,
              filter: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* badge */}
        {badge && badge > 0 && !inline && (
          <div
            style={{
              position: 'absolute',
              right: -2,
              top: -2,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 8px rgba(0,0,0,0.3)',
            }}
          >
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </button>
    </div>
  );
};
