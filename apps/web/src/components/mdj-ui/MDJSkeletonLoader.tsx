'use client';

import React from 'react';

interface MDJSkeletonLoaderProps {
  height?: string;
  width?: string;
  className?: string;
  lines?: number;
  variant?: 'card' | 'text' | 'circle' | 'table';
}

export function MDJSkeletonLoader({ 
  height = '4rem', 
  width = '100%', 
  className = '',
  lines = 1,
  variant = 'card'
}: MDJSkeletonLoaderProps) {
  
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded"
            style={{
              height: '1rem',
              width: i === lines - 1 ? '75%' : '100%',
              background: 'linear-gradient(90deg, var(--surface) 25%, var(--elev) 50%, var(--surface) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div
        className={`animate-pulse rounded-full ${className}`}
        style={{
          height,
          width: height, // Make it square for circle
          background: 'linear-gradient(90deg, var(--surface) 25%, var(--elev) 50%, var(--surface) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Table header */}
        <div className="flex space-x-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded h-4 flex-1"
              style={{
                background: 'linear-gradient(90deg, var(--surface) 25%, var(--elev) 50%, var(--surface) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="animate-pulse rounded h-6 flex-1"
                style={{
                  background: 'linear-gradient(90deg, var(--surface) 25%, var(--elev) 50%, var(--surface) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  animationDelay: `${(i * 5 + j) * 0.1}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{
        height,
        width,
        background: 'linear-gradient(90deg, var(--surface) 25%, var(--elev) 50%, var(--surface) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// Add shimmer animation to CSS
const shimmerCSS = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject CSS if not already present
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerCSS;
  document.head.appendChild(style);
}

export default MDJSkeletonLoader;