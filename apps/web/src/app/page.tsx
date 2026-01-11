'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MDJLoadingScreen } from '@/components/mdj-ui';

export default function HomePage() {
  const router = useRouter();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
    // Redirect to login after loading screen completes
    router.push('/login');
  };

  if (showLoadingScreen) {
    return <MDJLoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Show a brief transition while redirecting
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'var(--bg-topbar)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ color: 'var(--brand-lavender)', fontSize: '18px' }}>Redirecting...</div>
    </div>
  );
}