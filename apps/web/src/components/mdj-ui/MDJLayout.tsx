'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';
import { MDJAssist } from '@/components/mdj-ui/MDJAssist';
import { useAuth } from '@/contexts/AuthContext';

// ✅ Import global unified style file
// Note: Main CSS is imported in layout.tsx, no need to import here

type MDJLayoutProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

const nav: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',   icon: <span>📊</span> },
  { href: '/clients',         label: 'Clients',     icon: <span>👥</span> },
  { href: '/services',        label: 'Services',    icon: <span>⚙️</span> },
  { href: '/companies-house', label: 'CH Search',   icon: <span>🏢</span> },
  { href: '/tasks',           label: 'Tasks',       icon: <span>✓</span> },
  { href: '/documents',       label: 'Documents',   icon: <span>📄</span> },
  { href: '/audit',           label: 'Audit',       icon: <span>🔍</span> },
  { href: '/calendar',        label: 'Calendar',    icon: <span>📅</span> },
  { href: '/people',          label: 'People',      icon: <span>👤</span> },
  { href: '/settings',        label: 'Settings',    icon: <span>⚙️</span> },
];

export function MDJLayout({
  title,
  subtitle,
  actions,
  children,
}: MDJLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedLogo } = useBranding();
  const { logout } = useAuth();

  // Pin toggle state management
  const [isPinned, setIsPinned] = useState(false);

  // Toggle pin state
  const handlePinToggle = () => {
    setIsPinned(!isPinned);
  };

  // Keyboard handler for pin toggle
  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePinToggle();
    }
  };

  // Escape key handler to close pinned buttons
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPinned) {
        setIsPinned(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isPinned]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local session data anyway and redirect
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

    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        await (window as any).electron.quit();
      } catch (error) {
        console.error('Shutdown failed:', error);
        alert('Unable to shutdown application');
      }
    } else {
      // Browser fallback
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
    <div className="mdj-shell-fixed">
      {/* === Top Bar === */}
      <header className="mdj-topbar" role="banner">
        {/* Left side - Logo and Brand */}
        <div className="mdj-topbar-left">
          <Link href="/dashboard" className="mdj-brand" aria-label="Practice Manager Home">
            <div className="mdj-brand-mark">
              <Image src={resolvedLogo} alt="Practice Logo" width={28} height={28} />
            </div>
            <span className="mdj-brand-text">Practice Manager</span>
          </Link>
        </div>

        {/* Right side - Pin Toggle, Action Buttons, User */}
        <div className="mdj-topbar-right">
          {/* Pin Toggle Button */}
          <button
            className={`mdj-pin-toggle ${isPinned ? 'active' : ''}`}
            onClick={handlePinToggle}
            onKeyDown={handlePinKeyDown}
            aria-label={isPinned ? 'Hide action buttons' : 'Show action buttons'}
            aria-expanded={isPinned}
            aria-controls="action-buttons"
            type="button"
          >
            📌
          </button>
          
          {/* Action Buttons - Conditionally Rendered */}
          {isPinned && (
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
          
          <span className="mdj-user">Admin User</span>
        </div>
      </header>

      {/* === Sidebar === */}
      <aside className="mdj-sidebar-fixed" role="navigation" aria-label="Primary Navigation">
        <nav>
          <ul className="mdj-navlist">
            {nav.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      'mdj-nav-item',
                      active ? 'active' : '',
                    ].join(' ')}
                  >
                    {item.icon && <span className="mdj-nav-icon">{item.icon}</span>}
                    <span className="mdj-nav-label">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* === Main Content === */}
      <main className="mdj-content-offset" role="main">
        {(title || actions) && (
          <div className="mdj-pagehead">
            <div className="mdj-page-titles">
              {title && <h1 className="mdj-h1 mdj-page-title">{title}</h1>}
              {subtitle && <p className="mdj-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="mdj-page-actions">{actions}</div>}
          </div>
        )}

        {(title || actions) && <hr className="mdj-gold-rule" />}

        {/* Page Content */}
        {children}
      </main>

      {/* === M Assist - Bottom Right === */}
      <MDJAssist />
    </div>
  );
}

export default MDJLayout;
