'use client';

import { api } from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { MDJAssist } from '@/components/mdj-ui/MDJAssist';

type Action =
  | { label: string; href: string; variant?: 'primary' | 'outline' }
  | { label: string; onClick: () => void; variant?: 'primary' | 'outline' };

interface MDJShellProps {
  pageTitle?: string;
  pageSubtitle?: string;
  actions?: (Action | ReactNode)[];
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  navWidthPx?: number;
  topbarHeightPx?: number;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Clients', href: '/clients', icon: '👥' },
  { label: 'Services', href: '/services', icon: '⚙️' },
  { label: 'Accounts Production', href: '/accounts-production', icon: '📈' },
  { label: 'Tax Calculations', href: '/tax-calculations', icon: '🧮' },
  { label: 'Compliance', href: '/compliance', icon: '📋' },
  { label: 'CH Search', href: '/companies-house', icon: '🏢' },
  { label: 'Tasks', href: '/tasks', icon: '✓' },
  { label: 'Documents', href: '/documents', icon: '📄' },
  { label: 'Letters', href: '/templates', icon: '✉️' },
  { label: 'Audit', href: '/audit', icon: '🔍' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'People', href: '/people', icon: '👤' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function MDJShell({
  pageTitle,
  pageSubtitle,
  actions = [],
  showBack = false,
  backHref,
  backLabel,
  breadcrumbs = [],
  navWidthPx = 200,
  topbarHeightPx = 72,
  children,
}: MDJShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedLogo } = useBranding();
  const { logout } = useAuth();
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [frontendStatus, setFrontendStatus] = useState<'online' | 'offline'>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [backendStatus, setBackendStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [actionButtonsPinned, setActionButtonsPinned] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('mdj-nav-pinned');
    const defaultPinned = stored !== null ? stored === 'true' : window.innerWidth >= 1100;
    setSidebarPinned(defaultPinned);
    setSidebarOpen(defaultPinned);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setFrontendStatus('online');
    const handleOffline = () => setFrontendStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshBackendStatus = useCallback(async () => {
    setBackendStatus('loading');
    try {
      await api.get('/status');
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend status check failed:', error);
      setBackendStatus('offline');
    }
  }, []);

  useEffect(() => {
    refreshBackendStatus();
    const interval = setInterval(refreshBackendStatus, 60000);
    return () => clearInterval(interval);
  }, [refreshBackendStatus]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    localStorage.setItem('mdj-nav-pinned', JSON.stringify(sidebarPinned));
    if (sidebarPinned) {
      setSidebarOpen(true);
    }
  }, [sidebarPinned, hydrated]);

  const dimsStyle = useMemo(
    () => ({
      ['--mdj-topbar-h' as any]: `${topbarHeightPx}px`,
      ['--mdj-sidebar-w' as any]: `${navWidthPx}px`,
    }),
    [navWidthPx, topbarHeightPx]
  );

  const shellClass = useMemo(() => {
    const classes = ['mdj-shell-fixed'];
    classes.push(sidebarPinned ? 'sidebar-pinned' : 'sidebar-floating');
    if (!sidebarPinned && sidebarOpen) classes.push('sidebar-open');
    return classes.join(' ');
  }, [sidebarPinned, sidebarOpen]);

  const renderAction = (a: Action | ReactNode, i: number) => {
    // Allow passing React elements directly
    if (typeof a === 'object' && a !== null && (a as any)['$$typeof']) {
      return <span key={i}>{a as ReactNode}</span>;
    }
    a = a as Action;
    const cls =
      (a as any).variant === 'primary'
        ? 'btn-primary'
        : (a as any).variant === 'outline'
        ? 'btn-secondary'
        : 'btn-primary';
    return 'href' in a ? (
      <Link key={i} href={a.href} className={cls}>
        {a.label}
      </Link>
    ) : (
      <button key={i} className={cls} onClick={(a as any).onClick}>
        {(a as any).label}
      </button>
    );
  };

  const toggleSidebar = () => {
    if (sidebarPinned) return;
    setSidebarOpen(prev => !prev);
  };

  const handlePinToggle = () => {
    setSidebarPinned(prev => {
      const next = !prev;
      setSidebarOpen(next);
      return next;
    });
  };

  const handleNavClick = () => {
    if (!sidebarPinned) {
      setSidebarOpen(false);
    }
  };

  const statusLabel = (status: 'loading' | 'online' | 'offline') => {
    if (status === 'loading') return 'Checking…';
    return status === 'online' ? 'Online' : 'Offline';
  };

  // Action buttons pin toggle handler
  const handleActionPinToggle = () => {
    setActionButtonsPinned(prev => !prev);
  };

  // Keyboard handler for action pin toggle
  const handleActionPinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActionPinToggle();
    }
  };

  // Escape key handler to close action buttons
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actionButtonsPinned) {
        setActionButtonsPinned(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [actionButtonsPinned]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/login');
    }
  };

  // Keyboard handler for logout button
  const handleLogoutKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLogout();
    }
  };

  // Shutdown handler
  const handleShutdown = async () => {
    const confirmed = window.confirm('Are you sure you want to shutdown the application?');
    if (!confirmed) return;

    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        await (window as any).electron.quit();
      } catch (error) {
        console.error('Shutdown failed:', error);
        alert('Unable to shutdown application');
      }
    } else {
      alert('Please close the browser tab to exit');
    }
  };

  // Keyboard handler for shutdown button
  const handleShutdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleShutdown();
    }
  };

  return (
    <div className={shellClass} style={dimsStyle as React.CSSProperties}>
      <header className="mdj-topbar">
        {/* Left controls: nav toggle + sidebar pin */}
        <div className="mdj-topbar-left">
          {!sidebarPinned && (
            <button
              className={`mdj-nav-toggle ${sidebarOpen ? 'active' : ''}`}
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
          )}
          
          {/* Sidebar Pin Toggle */}
          <button
            className={`mdj-pin-toggle ${sidebarPinned ? 'active' : ''}`}
            onClick={handlePinToggle}
            aria-label={sidebarPinned ? 'Unpin navigation' : 'Pin navigation'}
          >
            📌
          </button>
        </div>

        {/* Center brand: stays centered regardless of sidebar */}
        <button
          className="mdj-brand mdj-topbar-center fx-row"
          onClick={() => router.push('/dashboard')}
          aria-label="Go to Dashboard"
        >
          <Image src={resolvedLogo} alt="Practice Logo" width={28} height={28} className="mdj-brand-mark" priority />
          <span className="mdj-brand-text">Practice Manager</span>
        </button>

        {/* Right controls: user + action pin + action buttons */}
        <div className="mdj-topbar-right">
          <span className="mdj-user">Admin User</span>

          {/* Action Buttons Pin Toggle */}
          <button
            className={`mdj-pin-toggle ${actionButtonsPinned ? 'active' : ''}`}
            onClick={handleActionPinToggle}
            onKeyDown={handleActionPinKeyDown}
            aria-label={actionButtonsPinned ? 'Hide action buttons' : 'Show action buttons'}
            aria-expanded={actionButtonsPinned}
            aria-controls="action-buttons"
            type="button"
          >
            📌
          </button>

          {/* Action Buttons - Conditionally Rendered */}
          {actionButtonsPinned && (
            <div id="action-buttons" className="mdj-action-buttons" role="group" aria-label="Session actions">
              <button
                className="btn-action-compact danger"
                onClick={handleShutdown}
                onKeyDown={handleShutdownKeyDown}
                aria-label="Shutdown application"
                type="button"
              >
                ⏻ <span className="btn-label">Shutdown</span>
              </button>
              <button
                className="btn-action-compact"
                onClick={handleLogout}
                onKeyDown={handleLogoutKeyDown}
                aria-label="Logout from current session"
                type="button"
              >
                🚪 <span className="btn-label">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className="mdj-sidebar-fixed">
        <nav>
          <ul className="mdj-navlist">
            {navItems.map(item => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`mdj-nav-item ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={handleNavClick}
                  >
                    <span className="mdj-nav-icon">{item.icon}</span>
                    <span className="mdj-nav-label">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mdj-nav-footer">
          <div className="mdj-status-row">
            <div>
              <span className="mdj-status-label">Front-end</span>
              <p className="mdj-status-helper">Next.js UI</p>
            </div>
            <div className={`mdj-status-pill ${frontendStatus}`}>
              <span className="dot" />
              <span className="text">{frontendStatus === 'online' ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <div className="mdj-status-row">
            <div>
              <span className="mdj-status-label">Backend</span>
              <p className="mdj-status-helper">API & services</p>
            </div>
            <div className={`mdj-status-pill ${backendStatus}`}>
              <span className="dot" />
              <span className="text">{statusLabel(backendStatus)}</span>
            </div>
          </div>

          <button className="mdj-status-refresh" onClick={refreshBackendStatus}>
            Refresh status
          </button>
        </div>
      </aside>

      {!sidebarPinned && sidebarOpen && (
        <button
          className="mdj-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main className="mdj-content-offset">
        {(pageTitle || pageSubtitle || actions.length > 0) && (
          <div className="mdj-pagehead">
            <div>
              {pageTitle && <h1 className="mdj-page-title">{pageTitle}</h1>}
              {pageSubtitle && <p className="mdj-page-subtitle">{pageSubtitle}</p>}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="mdj-breadcrumbs" aria-label="Breadcrumb">
                  {breadcrumbs.map((bc, i) => (
                    <span key={`${bc.label}-${i}`} className="crumb">
                      {bc.href ? <Link href={bc.href}>{bc.label}</Link> : <span>{bc.label}</span>}
                      {i < breadcrumbs.length - 1 && <span className="sep">/</span>}
                    </span>
                  ))}
                </nav>
              )}
            </div>
            {actions.length > 0 && <div className="mdj-page-actions">{actions.map(renderAction)}</div>}
          </div>
        )}
        {showBack && (
          <div className="mdj-backlink">
            {backHref ? (
              <Link href={backHref} className="back-link">← {backLabel || 'Back'}</Link>
            ) : (
              <button className="back-link ghost" onClick={() => router.back()}>← {backLabel || 'Back'}</button>
            )}
          </div>
        )}
        <hr className="mdj-gold-rule" />
        <div className="mdj-pagebody">{children}</div>
      </main>

      {/* M Assist - Bottom Right */}
      <MDJAssist />
    </div>
  );
}
