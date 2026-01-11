"use client";
import React, { useState } from 'react';

export const NativeShutdownButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const isNative = typeof navigator !== 'undefined' && /Electron|Nativefier/i.test(navigator.userAgent);
  if (!isNative) return null;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api/v1').replace(/\/+$/, '');
  const secret = process.env.NEXT_PUBLIC_MDJ_SHUTDOWN_SECRET || '';

  const handle = async () => {
    if (!confirm('Shut down the app and exit? This will stop the local API & web servers.')) return;
    setLoading(true);
    try {
      await fetch(`${apiBase}/internal/shutdown`, {
        method: 'POST',
        headers: secret ? { 'x-mdj-shutdown': secret } : {},
      });

      // Give servers a moment to stop, then close the window (Electron will quit if last window closed)
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          // ignore
        }
      }, 800);
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      alert('Failed to request shutdown: ' + msg);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      aria-label="Exit and shut down local servers"
      title="Exit and shut down local servers"
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--dim)',
        padding: '6px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
      }}
    >
      {loading ? '⏳' : '⏻'}
    </button>
  );
};

export default NativeShutdownButton;
