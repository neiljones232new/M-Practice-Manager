'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { MDJAssistFAB } from './MDJAssistFAB';
import { MDJAssistDrawer } from './MDJAssistDrawer';
import { MDJAssistChat } from './MDJAssistChat';
import { API_BASE_URL } from '@/lib/api';

interface MDJAssistProps {
  inline?: boolean;
}

export const MDJAssist: React.FC<MDJAssistProps> = ({ inline = false }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'ok' | 'warn' | 'error'>('ok');
  const [assistOnline, setAssistOnline] = useState<boolean | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const openDrawer = useCallback(() => {
    setOpen(true);
    setShowTooltip(false);
    try {
      localStorage.setItem('m-assist-tooltip-seen', '1');
    } catch {}
  }, []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  // Lightweight page status detection
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const computeStatus = (): 'ok' | 'warn' | 'error' => {
      // Check for explicit markers first
      if (
        document.querySelector('[data-mdj-status="error"], .mdj-error, [role="alert"], .error, .alert-danger')
      ) {
        return 'error';
      }
      if (
        document.querySelector('[data-mdj-status="warn"], .mdj-warn, .warning, .alert-warn, .alert-warning')
      ) {
        return 'warn';
      }
      return 'ok';
    };

    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newStatus = computeStatus();
        setStatus(prevStatus => {
          // Only update if status actually changed
          return prevStatus !== newStatus ? newStatus : prevStatus;
        });
      }, 100);
    };

    // Initial status check
    debouncedUpdate();

    // Observe DOM mutations to auto-update status (with debouncing)
    const observer = new MutationObserver((mutations) => {
      // Only react to mutations that might affect status
      const hasRelevantChanges = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          // Check if added/removed nodes contain status-related classes
          const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
          return nodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              return element.matches && (
                element.matches('[data-mdj-status], .mdj-error, .mdj-warn, [role="alert"], .error, .alert-danger, .warning, .alert-warn, .alert-warning') ||
                element.querySelector('[data-mdj-status], .mdj-error, .mdj-warn, [role="alert"], .error, .alert-danger, .warning, .alert-warn, .alert-warning')
              );
            }
            return false;
          });
        }
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          return target.matches && target.matches('[data-mdj-status], .mdj-error, .mdj-warn, [role="alert"], .error, .alert-danger, .warning, .alert-warn, .alert-warning');
        }
        return false;
      });

      if (hasRelevantChanges) {
        debouncedUpdate();
      }
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['data-mdj-status', 'class', 'role']
    });

    // Listen to broadcast channel for explicit status pushes
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('mdj');
      bc.onmessage = (ev: MessageEvent) => {
        const t = ev?.data?.topic;
        if (t === 'severity') {
          const level = ev?.data?.level;
          if (level === 'error' || level === 'warn' || level === 'ok') {
            setStatus(prevStatus => prevStatus !== level ? level : prevStatus);
          }
        }
      };
    } catch {}

    const handleStatusEvent = () => debouncedUpdate();
    window.addEventListener('mdj:status', handleStatusEvent);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      try { if (bc) bc.close(); } catch {}
      window.removeEventListener('mdj:status', handleStatusEvent);
    };
  }, []);

  // Check backend availability for status chip
  useEffect(() => {
    let alive = true;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/assist/status`, { cache: 'no-store' });
        if (!alive) return;
        if (!res.ok) {
          setAssistOnline(false);
          return;
        }
        const data = await res.json();
        setAssistOnline(Boolean(data?.online));
      } catch {
        if (!alive) return;
        setAssistOnline(false);
      }
    };

    checkStatus();
    const intervalId = window.setInterval(checkStatus, 60_000);
    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // One-time tooltip
  useEffect(() => {
    try {
      const seen = localStorage.getItem('m-assist-tooltip-seen');
      if (!seen && !inline) {
        setShowTooltip(true);
        const timer = window.setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem('m-assist-tooltip-seen', '1');
        }, 5000);
        return () => window.clearTimeout(timer);
      }
    } catch {}
  }, [inline]);

  return (
    <>
      {/* FAB or inline button */}
      <MDJAssistFAB
        onClick={openDrawer}
        badge={0}
        status={status}
        inline={inline}
        position="bottom-right"
        sizePx={inline ? 48 : undefined}
        label="M Assist"
        showLabel={!inline}
        online={assistOnline}
        showTooltip={showTooltip}
        tooltipText="Ask M Assist"
      />

      {/* Drawer with translucent background + chat inside */}
      <MDJAssistDrawer open={open} onClose={closeDrawer} ariaLabel="M Assist">
        <MDJAssistChat />
      </MDJAssistDrawer>
    </>
  );
};

export default MDJAssist;
