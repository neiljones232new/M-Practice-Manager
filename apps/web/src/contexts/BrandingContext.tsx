'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const STORAGE_KEY = 'mdj-brand-logo';
export const DEFAULT_LOGO = '/mdj_goldlogo.png';

interface BrandingContextValue {
  logoSrc: string | null;
  resolvedLogo: string;
  isCustomLogo: boolean;
  updateLogo: (dataUrl: string | null) => void;
  resetLogo: () => void;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Prefer server-stored branding if available
        const res = await api.get<{ dataUrl: string | null }>('/integrations/settings/logo', { suppressErrorLog: true } as any);
        if (!alive) return;
        if (res && res.dataUrl) {
          setLogoSrc(res.dataUrl);
          if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, res.dataUrl);
        } else if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setLogoSrc(stored);
        }
      } catch {
        // Fallback to local cache if API not reachable yet
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setLogoSrc(stored);
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const persistLogo = useCallback(async (dataUrl: string | null) => {
    setLogoSrc(dataUrl);
    try {
      await api.put('/integrations/settings/logo', { dataUrl });
    } catch (e) {
      // Still cache locally even if API fails for any reason
    }
    if (typeof window !== 'undefined') {
      if (dataUrl) localStorage.setItem(STORAGE_KEY, dataUrl);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<BrandingContextValue>(() => {
    const resolved = logoSrc && hydrated ? logoSrc : DEFAULT_LOGO;
    return {
      logoSrc: hydrated ? logoSrc : null,
      resolvedLogo: resolved,
      isCustomLogo: Boolean(logoSrc),
      updateLogo: persistLogo,
      resetLogo: () => persistLogo(null),
    };
  }, [hydrated, logoSrc, persistLogo]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return ctx;
}
