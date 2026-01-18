// =====================================================
// apps/web/components/mdj-ui/MDJDashboardLayoutResponsive.tsx
// M Responsive Dashboard Layout (auto-collapsing sidebar)
// =====================================================

'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import NativeShutdownButton from '@/components/NativeShutdownButton';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export const MDJDashboardLayoutResponsive: React.FC<LayoutProps> = ({
  children,
  title,
  actions,
}) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);

  // Automatically collapse for screens under 900px
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggle = () => setCollapsed(!collapsed);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/clients', label: 'Clients', icon: '👥' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
    { href: '/filings', label: 'Filings', icon: '📁' },
    { href: '/assist', label: 'M Assist', icon: '✨' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : collapsed ? '80px 1fr' : '240px 1fr',
        transition: 'grid-template-columns .3s ease',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* === Sidebar === */}
      <aside
        style={{
          position: mobile ? 'fixed' : 'relative',
          left: mobile && !collapsed ? 0 : mobile ? '-240px' : 0,
          top: 0,
          bottom: 0,
          width: mobile ? 240 : collapsed ? 80 : 240,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: collapsed ? '16px 8px' : '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all .3s ease',
          zIndex: 50,
          boxShadow: mobile && !collapsed ? '0 0 20px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        <div>
          {/* Logo + Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              marginBottom: 30,
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(109,40,217,0.3), transparent 70%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: 'var(--brand-primary)',
                fontWeight: 700,
                boxShadow: '0 0 8px rgba(109, 40, 217, 0.4)',
              }}
            >
              M
            </div>
            {!collapsed && (
              <button
                onClick={toggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  cursor: 'pointer',
                  fontSize: 20,
                }}
              >
                ⮜
              </button>
            )}
            {collapsed && (
              <button
                onClick={toggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  cursor: 'pointer',
                  fontSize: 20,
                }}
              >
                ⮞
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx('link-primary')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: 10,
                    padding: collapsed ? '10px 0' : '10px 12px',
                    borderRadius: '8px',
                    background: active ? 'var(--elev)' : 'transparent',
                    color: active ? 'var(--brand-primary)' : 'var(--dim)',
                    fontWeight: active ? 600 : 400,
                    marginBottom: 4,
                    transition: 'all .2s ease',
                  }}
                  onClick={() => mobile && setCollapsed(true)}
                >
                  <span>{item.icon}</span>
                  {!collapsed && !mobile && item.label}
                  {!collapsed && mobile && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--dim)',
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            v1.0 • Light + Purple
          </div>
        )}
      </aside>

      {/* === Main Content === */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        {/* Top bar */}
        <header
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {mobile && (
              <button
                onClick={toggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  fontSize: 22,
                  cursor: 'pointer',
                }}
              >
                ☰
              </button>
            )}
            <h1 style={{ fontSize: 22, color: 'var(--brand-primary)' }}>{title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {actions}
            <NativeShutdownButton />
          </div>
        </header>

        {/* Scrollable content area */}
        <div
          style={{
            padding: '32px',
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg)',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};
