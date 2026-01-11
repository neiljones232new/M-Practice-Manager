// MDJ UI Components (re-exports unchanged)
export { MDJLayout } from './MDJLayout';
export { MDJAssist } from './MDJAssist';
export { MDJAssistChat } from './MDJAssistChat';
export { MDJAssistDrawer } from './MDJAssistDrawer';
export { MDJAssistFAB } from './MDJAssistFAB';
export { MDJAssistLogo } from './MDJAssistLogo';
export { MDJKPITile } from './MDJKPITile';
export { MDJPriorityRecommendations } from './MDJPriorityRecommendations';
export { MDJQueryTemplates } from './MDJQueryTemplates';
export { MDJReportsPanel } from './MDJReportsPanel';
export { MDJServerStatus } from './MDJServerStatus';
export { MDJTemplateDrawer } from './MDJTemplateDrawer';
// MDJWeekAheadView is not exported; MDJReportsPanel covers report UI

export { default as MDJLoadingScreen } from './MDJLoadingScreen';
export { default as MDJAppWrapper } from './MDJAppWrapper';
export { MDJSkeletonLoader } from './MDJSkeletonLoader';

// 🔗 Pull in the unified design system
// Note: Main CSS is imported in layout.tsx, no need to import here
import React from 'react';

/* =================================================================================
 * Buttons
 * ================================================================================= */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const MDJButton: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all';
  const byVariant =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'outline'
      ? 'btn-outline-primary'
      : variant === 'ghost'
      ? 'btn-soft'
      : 'btn-primary';
  const bySize =
    size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm';

  return (
    <button
      className={`${base} ${byVariant} ${bySize} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--border)] border-t-[var(--brand-primary)]" />}
      {leftIcon && <span className="inline-flex">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="inline-flex">{rightIcon}</span>}
    </button>
  );
};

/* =================================================================================
 * Inputs
 * ================================================================================= */
type InputBaseProps = {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
};

export const MDJInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & InputBaseProps
> = ({ label, helperText, error, leftIcon, rightIcon, className = '', ...props }) => {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>{label}</label>}

      <div className="relative">
        {leftIcon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{leftIcon}</div>}
        <input
          {...props}
          className={`input-mdj ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}`}
          style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-bg)' } : undefined}
        />
        {rightIcon && <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">{rightIcon}</div>}
      </div>

      {error ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{typeof error === 'string' ? error : 'Error'}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{helperText}</p>
      ) : null}
    </div>
  );
};

export const MDJSelect: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & InputBaseProps & { options?: { label: string; value: string }[]; placeholder?: string }
> = ({ label, helperText, error, options, placeholder, className = '', children, ...props }) => {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>{label}</label>}
      <select
        className="input-mdj"
        style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-bg)' } : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{typeof error === 'string' ? error : 'Error'}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{helperText}</p>
      ) : null}
    </div>
  );
};

export const MDJTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & InputBaseProps
> = ({ label, helperText, error, className = '', ...props }) => {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>{label}</label>}
      <textarea
        className="input-mdj"
        rows={props.rows ?? 3}
        style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-bg)' } : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{typeof error === 'string' ? error : 'Error'}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{helperText}</p>
      ) : null}
    </div>
  );
};

/* =================================================================================
 * Loader
 * ================================================================================= */
export const MDJLoader: React.FC<{ size?: 'sm' | 'md' | 'lg'; message?: string }> = ({ size = 'md', message }) => {
  const dims = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`animate-spin rounded-full border-2 ${dims}`} style={{ borderColor: 'var(--border)', borderTopColor: 'var(--brand-primary)' }} />
      {message && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>}
    </div>
  );
};

/* =================================================================================
 * Cards / Sections
 * ================================================================================= */
export const MDJCard: React.FC<{
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, title, subtitle, actions, padding = 'md', className = '', ...props }) => {
  const pad = padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : 'p-6';
  return (
    <div className={`card-mdj ${pad} ${className}`} {...props}>
      {(title || subtitle || actions) && (
        <div className="card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            {title && <h3 className="mdj-h2 m-0">{title}</h3>}
            {subtitle && <p className="mdj-sub mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="row gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const MDJSection: React.FC<{
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ children, title, subtitle, actions, className = '', ...props }) => (
  <section className={`mb-8 ${className}`} {...props}>
    {(title || subtitle || actions) && (
      <div className="mb-4 flex items-start justify-between">
        <div>
          {title && <h2 className="section-head">{title}</h2>}
          <hr className="section-hr" />
          {subtitle && <p className="mdj-sub">{subtitle}</p>}
        </div>
        {actions && <div className="row gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

/* =================================================================================
 * Table
 * ================================================================================= */
export const MDJTable: React.FC<{
  columns: Array<{ key: string; header: React.ReactNode; width?: number | string; align?: 'left' | 'center' | 'right'; render?: (value: any, row: any) => React.ReactNode }>;
  data: any[];
  emptyMessage?: string;
  className?: string;
}> = ({ columns, data, emptyMessage, className = '', ...props }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="mdj-sub">{emptyMessage || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`} {...props}>
      <table className="table-clean">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c.key || i} className={`${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`} style={{ width: c.width }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, r) => (
            <tr key={row.id || r}>
              {columns.map((c, ci) => (
                <td key={c.key || ci} className={`${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* =================================================================================
 * Modal / Form helpers
 * ================================================================================= */
export const MDJModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ isOpen, onClose, title, children, className = '' }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-w-lg w-full mx-auto mt-20">
        <div className="card-mdj elevate">
          {title && (
            <div className="card-header">
              <h3 className="mdj-h2 m-0">{title}</h3>
              <button className="btn-outline-primary btn-sm" onClick={onClose}>Close</button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export const MDJFormGroup: React.FC<{ label?: string; error?: string; className?: string; children: React.ReactNode }> = ({
  label,
  error,
  className = '',
  children,
}) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>{label}</label>}
    {children}
    {error && <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
  </div>
);

export const MDJCheckbox: React.FC<{
  label?: string;
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
}> = ({ label, checked, onChange, className = '', ...props }) => (
  <label className={`flex items-center gap-2 ${className}`} style={{ color: 'var(--text-dark)' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded"
      style={{ accentColor: 'var(--brand-primary)' }}
      {...props}
    />
    {label}
  </label>
);

/* =================================================================================
 * Badges (kept for compatibility; mapped to unified styles)
 * ================================================================================= */
export const MDJBadge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  const base = 'badge';
  const byVariant =
    variant === 'success'
      ? 'success'
      : variant === 'warning'
      ? 'warn'
      : variant === 'error'
      ? 'danger'
      : variant === 'primary'
      ? 'primary' // Use primary badge style for purple branding
      : '';
  return (
    <span className={`${base} ${byVariant ? byVariant : ''} ${sizeCls} ${className}`} {...props}>
      {children}
    </span>
  );
};
