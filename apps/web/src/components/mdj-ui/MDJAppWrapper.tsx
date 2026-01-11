'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';

interface MDJAppWrapperProps {
  children: React.ReactNode;
}

export default function MDJAppWrapper({ children }: MDJAppWrapperProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const [showInitialLoading, setShowInitialLoading] = useState(true);

  const publicPages = ['/login', '/register', '/forgot-password'];
  const isPublicPage = publicPages.includes(pathname);

  const handleLoadingComplete = () => {
    setShowInitialLoading(false);
  };

  // Show initial loading screen
  if (showInitialLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Show auth loading state
  if (authLoading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-page)',
          color: 'var(--brand-lavender)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '1.1rem',
        }}
      >
        Loading M Practice Manager...
      </div>
    );
  }

  // --- Redirect unauthenticated users ---
  if (!isAuthenticated && !isPublicPage) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // --- Authenticated content ---
  return (
    <div
      style={{
        background: 'var(--bg-page)',
        minHeight: '100vh',
        color: 'var(--text-dark)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
