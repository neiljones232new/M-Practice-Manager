'use client';

import React, { useEffect, useRef } from 'react';
import { DEFAULT_LOGO } from '@/contexts/BrandingContext';

interface MDJAssistDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

export const MDJAssistDrawer: React.FC<MDJAssistDrawerProps> = ({
  open,
  onClose,
  children,
  ariaLabel = 'M Assist Drawer',
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Basic outside click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Slide-up animation via CSS class toggling
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) {
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    } else {
      el.style.transform = 'translateY(16px)';
      el.style.opacity = '0';
    }
  }, [open]);

  return (
    <>
      {/* Overlay (click to close) */}
      <div
        onMouseDown={handleOverlayClick}
        aria-hidden={!open}
        style={{
          position: 'fixed',
          inset: 0,
          background: open ? 'transparent' : 'transparent',
          zIndex: 9998,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'background .25s ease',
        }}
      />

      {/* Drawer container (bottom-right card) */}
      <div
        role="dialog"
        aria-label={ariaLabel}
        aria-modal="true"
        ref={panelRef}
        style={{
          position: 'fixed',
          right: '2rem',
          bottom: '6rem',
          width: 420,
          maxWidth: 'calc(100vw - 2rem)',
          height: 560,
          maxHeight: 'calc(100vh - 8rem)',
          display: open ? 'flex' : 'flex',
          flexDirection: 'column',
          transform: 'translateY(16px)',
          opacity: 0,
          transition: 'transform .25s ease, opacity .25s ease',
          zIndex: 9999,

          // Translucent “glass” look
          background: 'rgba(31,31,31,0.70)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',

          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: '16px',
          boxShadow: '0 18px 48px rgba(0,0,0,0.35), 0 0 24px rgba(200,166,82,0.25)',
          overflow: 'hidden',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid rgba(212,175,55,0.25)',
            color: '#f9f9f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={DEFAULT_LOGO}
              alt="M Assist Lion"
              style={{ width: 22, height: 22, filter: 'none' }}
            />
            <span className="mdj-brand-text" style={{ color: 'var(--brand-primary)', fontWeight: 800, letterSpacing: '.3px' }}>M Assist</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close M Assist"
            style={{
              background: 'transparent',
              color: '#f9f9f9',
              border: '1px solid rgba(212,175,55,0.35)',
              borderRadius: 8,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </>
  );
};
