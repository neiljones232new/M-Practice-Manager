'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_LOGO } from '@/contexts/BrandingContext';

interface MDJLoadingScreenProps {
  onComplete?: () => void;
}

/**
 * Full-screen MDJ splash that:
 *  - shows concentric rotating rings around the logo
 *  - spawns soft floating particles
 *  - cycles through 4 status lines
 *  - fades out, then calls onComplete()
 *
 * All styles are self-contained here to avoid theme collisions.
 */
export default function MDJLoadingScreen({ onComplete }: MDJLoadingScreenProps) {
  const [phase, setPhase] = useState(0); // drives status steps
  const [isFading, setIsFading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // spawn particles once
  useEffect(() => {
    const el = containerRef.current?.querySelector('.mdj-particles');
    if (!el) return;
    el.innerHTML = '';
    const COUNT = 18;
    for (let i = 0; i < COUNT; i++) {
      const dot = document.createElement('div');
      dot.className = 'mdj-particle';
      const size = 4 + Math.random() * 6;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.setProperty('--mdj-delay', `${Math.random() * 2}s`);
      dot.style.setProperty('--mdj-duration', `${3 + Math.random() * 2.5}s`);
      dot.style.setProperty('--mdj-x', `${-4 + Math.random() * 8}px`);
      dot.style.setProperty('--mdj-y', `${-8 + Math.random() * 12}px`);
      dot.style.opacity = `${0.5 + Math.random() * 0.4}`;
      el.appendChild(dot);
    }
  }, []);

  // drive status timeline (2s per step + 2s ready hold)
  useEffect(() => {
    const steps = [0, 1, 2, 3]; // indexes
    let i = 0;
    const tick = () => {
      if (i < steps.length - 1) {
        i++;
        setPhase(i);
        timer = window.setTimeout(tick, 2000);
      } else {
        // hold on "Ready" for 2s, then fade out
        timer = window.setTimeout(() => {
          setIsFading(true);
          // wait for CSS fade, then complete
          window.setTimeout(() => {
            onCompleteRef.current?.();
          }, 500);
        }, 2000);
      }
    };
    let timer = window.setTimeout(tick, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const orbitDots = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, idx) => ({
        id: idx,
        radius: 58 + Math.random() * 16,
        duration: 3.2 + Math.random() * 2,
        delay: Math.random() * 1.5,
        angle: Math.random() * 360,
        size: 5 + Math.random() * 5,
      })),
    []
  );

  const status = [
    { title: 'Starting Servers', detail: 'Initializing backend and frontend services…' },
    { title: 'Loading Database', detail: 'Connecting to PostgreSQL database…' },
    { title: 'Checking Integrations', detail: 'Verifying Companies House & MDJ services…' },
    { title: 'Ready', detail: 'All systems operational. Welcome to MDJ Practice Manager!' },
  ][phase];

  return (
    <div
      ref={containerRef}
      className={`mdj-splash ${isFading ? 'mdj-splash--fade' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="mdj-splash__inner">
        <div className="mdj-logo-wrap">
          {/* glowing rings */}
          <div className="mdj-ring mdj-ring--glow" />
          <div className="mdj-ring mdj-ring--sweep" />
          <div className="mdj-ring mdj-ring--inner" />

          {/* orbiting dots */}
          <div className="mdj-orbit-dots">
            {orbitDots.map(dot => (
              <span
                key={dot.id}
                className="mdj-orbit-dot"
                style={
                  {
                    ['--orbit-duration' as any]: `${dot.duration}s`,
                    ['--orbit-delay' as any]: `${dot.delay}s`,
                    transform: `rotate(${dot.angle}deg)`,
                  } as React.CSSProperties
                }
              >
                <span
                  className="mdj-orbit-dot__ball"
                  style={
                    {
                      ['--orbit-radius' as any]: `${dot.radius}px`,
                      width: `${dot.size}px`,
                      height: `${dot.size}px`,
                    } as React.CSSProperties
                  }
                />
              </span>
            ))}
          </div>

          {/* logo */}
          <img src={DEFAULT_LOGO} className="mdj-logo" alt="MDJ Assist Lion" />

          {/* floating particles */}
          <div className="mdj-particles" />
        </div>

        <h1 className="mdj-title">MDJ Assist</h1>

        <div className="mdj-status">
          <div className="mdj-status__line">{status.title}</div>
          <div className="mdj-status__detail">{status.detail}</div>
        </div>

        <div className="mdj-ellipsis">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* self-contained styles */}
      <style jsx>{`
        .mdj-splash {
          position: fixed;
          inset: 0;
          z-index: 99999; /* above everything, incl. MDJ Assist */
          display: grid;
          place-items: center;
          background: radial-gradient(circle at center, #383e42 0%, #000000 100%);
          color: #f0f2f5;
          transition: opacity 0.5s ease;
        }
        .mdj-splash--fade { opacity: 0; }

        .mdj-splash__inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 16px;
          text-align: center;
        }

        .mdj-logo-wrap {
          position: relative;
          width: 160px;
          height: 160px;
          display: grid;
          place-items: center;
          filter: drop-shadow(0 0 18px rgba(212, 175, 55, 0.45));
        }

        .mdj-logo {
          width: 84px;
          height: 84px;
          z-index: 3;
        }

        .mdj-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .mdj-ring--glow {
          inset: -10px;
          background: radial-gradient(circle, rgba(255,214,142,0.45) 0%, rgba(0,0,0,0) 70%);
          filter: blur(10px);
        }
        .mdj-ring--inner {
          inset: -4px;
          border: 1px solid rgba(212,175,55,0.55);
          box-shadow: 0 0 20px rgba(212,175,55,0.35);
        }
        .mdj-ring--sweep {
          inset: -10px;
          background: conic-gradient(from 0deg, rgba(255,217,138,0.95) 0deg 50deg, transparent 50deg 360deg);
          animation: mdj-ring-spin 3s linear infinite;
          -webkit-mask: radial-gradient(circle, transparent 62%, black 64%);
          mask: radial-gradient(circle, transparent 62%, black 64%);
          filter: drop-shadow(0 0 14px rgba(255,217,138,0.45));
        }

        .mdj-orbit-dots {
          position: absolute;
          inset: -2px;
          z-index: 2;
        }
        .mdj-orbit-dot {
          position: absolute;
          inset: 0;
          animation: mdj-dot-orbit var(--orbit-duration,4s) linear infinite;
          animation-delay: var(--orbit-delay,0s);
          transform-origin: 50% 50%;
        }
        .mdj-orbit-dot__ball {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          background: #ffe7ad;
          box-shadow: 0 0 12px rgba(255,231,173,0.9);
          transform: translate(calc(var(--orbit-radius,60px)), -50%);
        }

        .mdj-particles {
          position: absolute;
          inset: -10%;
          overflow: hidden;
          z-index: 1;
        }
        .mdj-particle {
          position: absolute;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.8);
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.6);
          animation: mdj-float var(--mdj-duration, 3.2s) ease-in-out infinite;
          animation-delay: var(--mdj-delay, 0s);
          transition: opacity 0.3s ease;
        }

        .mdj-title {
          margin: 4px 0 2px;
          font-size: 20px;
          font-weight: 700;
          color: #ffd98a;
          letter-spacing: 0.02em;
          text-shadow: 0 0 12px rgba(212, 175, 55, 0.35);
        }

        .mdj-status {
          display: grid;
          gap: 4px;
          min-height: 52px;
        }
        .mdj-status__line {
          font-weight: 600;
          font-size: 15px;
        }
        .mdj-status__detail {
          font-size: 13px;
          color: #b7c0ce;
        }

        .mdj-ellipsis { display: flex; gap: 6px; margin-top: 6px; }
        .mdj-ellipsis span {
          width: 6px; height: 6px; border-radius: 50%;
          background: #c8a652;
          animation: mdj-bounce 1.2s infinite ease-in-out;
        }
        .mdj-ellipsis span:nth-child(2) { animation-delay: 0.15s; }
        .mdj-ellipsis span:nth-child(3) { animation-delay: 0.3s; }

        @keyframes mdj-rotate {
          from { transform: rotate(0deg) scale(var(--scale,1)); }
          to   { transform: rotate(360deg) scale(var(--scale,1)); }
        }
        @keyframes mdj-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes mdj-float {
          0%   { transform: translate3d(0,0,0); opacity: 0.7; }
          50%  { transform: translate3d(var(--mdj-x,4px), var(--mdj-y,-10px), 0); opacity: 1; }
          100% { transform: translate3d(0,0,0); opacity: 0.7; }
        }
        @keyframes mdj-dot-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes mdj-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
