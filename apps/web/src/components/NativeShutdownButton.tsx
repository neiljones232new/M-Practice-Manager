"use client";
import React, { useState, useEffect } from 'react';

/**
 * Custom hook to handle native shutdown logic
 */
export function useNativeShutdown() {
  const [loading, setLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(typeof navigator !== 'undefined' && /Electron|Nativefier/i.test(navigator.userAgent));
  }, []);

  const shutdown = async () => {
    if (!window.confirm('Shut down the app and exit? This will stop the local API & web servers.')) return;
    setLoading(true);

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api/v1').replace(/\/+$/, '');
    const secret = process.env.NEXT_PUBLIC_MDJ_SHUTDOWN_SECRET || '';

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
      window.alert('Failed to request shutdown: ' + msg);
      setLoading(false);
    }
  };

  return { isNative, loading, shutdown };
}

export const NativeShutdownButton: React.FC = () => {
  const { isNative, loading, shutdown } = useNativeShutdown();

  if (!isNative) return null;

  return (
    <button
      className="btn btn-danger"
      onClick={() => { void shutdown(); }}
      disabled={loading}
      aria-label="Exit and shut down local servers"
      title="Exit and shut down local servers"
    >
      {loading ? '...' : '⏻'}
    </button>
  );
};

export default NativeShutdownButton;
