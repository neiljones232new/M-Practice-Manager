'use client';
import React from 'react';
import clsx from 'clsx';

interface MDJAssistLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MDJAssistLogo: React.FC<MDJAssistLogoProps> = ({
  size = 'md',
  animated = true,
  className,
  onClick,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const particleSize = {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
  };

  return (
    <div 
      className={clsx(
        'relative flex items-center justify-center cursor-pointer',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Main Logo Circle */}
      <div
        className={clsx(
          'relative rounded-full flex items-center justify-center font-bold text-black transition-all duration-300',
          sizeClasses[size],
          animated && 'hover:scale-110'
        )}
        style={{
          background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
          boxShadow: animated 
            ? '0 0 20px rgba(109, 40, 217, 0.4), 0 0 40px rgba(109, 40, 217, 0.2)' 
            : 'var(--shadow-md)',
        }}
      >
        {/* Logo Text */}
        <span className={clsx(
          'font-bold',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          size === 'xl' && 'text-xl'
        )}>
          M
        </span>

        {/* Orbital Ring */}
        {animated && (
          <div
            className="absolute inset-0 rounded-full border-2 opacity-30"
            style={{
              borderColor: 'var(--brand-primary)',
              animation: 'mdj-orbit 8s linear infinite',
              transform: 'scale(1.3)',
            }}
          />
        )}

        {/* Pulsing Glow */}
        {animated && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(240, 200, 75, 0.3) 0%, transparent 70%)',
              animation: 'mdj-pulse 2s ease-in-out infinite',
              transform: 'scale(1.5)',
            }}
          />
        )}
      </div>

      {/* Orbital Particles */}
      {animated && (
        <>
          {/* Particle 1 */}
          <div
            className="absolute rounded-full"
            style={{
              width: particleSize[size],
              height: particleSize[size],
              background: 'var(--brand-primary)',
              animation: 'mdj-orbit-particle-1 6s linear infinite',
              boxShadow: '0 0 6px rgba(109, 40, 217, 0.8)',
            }}
          />
          
          {/* Particle 2 */}
          <div
            className="absolute rounded-full"
            style={{
              width: particleSize[size],
              height: particleSize[size],
              background: 'var(--brand-primary)',
              animation: 'mdj-orbit-particle-2 8s linear infinite',
              boxShadow: '0 0 6px rgba(109, 40, 217, 0.8)',
            }}
          />
          
          {/* Particle 3 */}
          <div
            className="absolute rounded-full"
            style={{
              width: particleSize[size] * 0.7,
              height: particleSize[size] * 0.7,
              background: 'var(--brand-primary)',
              animation: 'mdj-orbit-particle-3 10s linear infinite',
              boxShadow: '0 0 4px rgba(109, 40, 217, 0.6)',
            }}
          />
        </>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes mdj-orbit {
          from {
            transform: scale(1.3) rotate(0deg);
          }
          to {
            transform: scale(1.3) rotate(360deg);
          }
        }

        @keyframes mdj-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1.5);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.8);
          }
        }

        @keyframes mdj-orbit-particle-1 {
          from {
            transform: rotate(0deg) translateX(${size === 'sm' ? '20px' : size === 'md' ? '30px' : size === 'lg' ? '40px' : '60px'}) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(${size === 'sm' ? '20px' : size === 'md' ? '30px' : size === 'lg' ? '40px' : '60px'}) rotate(-360deg);
          }
        }

        @keyframes mdj-orbit-particle-2 {
          from {
            transform: rotate(120deg) translateX(${size === 'sm' ? '25px' : size === 'md' ? '35px' : size === 'lg' ? '45px' : '65px'}) rotate(-120deg);
          }
          to {
            transform: rotate(480deg) translateX(${size === 'sm' ? '25px' : size === 'md' ? '35px' : size === 'lg' ? '45px' : '65px'}) rotate(-480deg);
          }
        }

        @keyframes mdj-orbit-particle-3 {
          from {
            transform: rotate(240deg) translateX(${size === 'sm' ? '15px' : size === 'md' ? '25px' : size === 'lg' ? '35px' : '50px'}) rotate(-240deg);
          }
          to {
            transform: rotate(600deg) translateX(${size === 'sm' ? '15px' : size === 'md' ? '25px' : size === 'lg' ? '35px' : '50px'}) rotate(-600deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};
