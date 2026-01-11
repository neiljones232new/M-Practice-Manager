'use client';
import React from 'react';

interface MDJHeaderBarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  className?: string;
}

export const MDJHeaderBar: React.FC<MDJHeaderBarProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <header 
      className={`flex items-center justify-between px-8 py-4 ${className}`}
      style={{
        height: '64px',
        width: '100%',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="flex flex-col justify-center">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 mb-1">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    /
                  </span>
                )}
                {crumb.href ? (
                  <a 
                    href={crumb.href}
                    className="text-xs hover:underline transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span 
                    className="text-xs font-medium"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title + Subtitle */}
        <div>
          {title && (
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--brand-primary)' }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side actions */}
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
};
