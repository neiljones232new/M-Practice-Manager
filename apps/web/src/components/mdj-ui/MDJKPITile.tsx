import React from 'react';
import { MDJCard } from './index';

interface MDJKPITileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: string;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  className?: string;
}

export function MDJKPITile({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'default',
  onClick,
  className = ''
}: MDJKPITileProps) {
  const colorClasses = {
    default: { color: 'var(--text)' },
    success: { color: 'var(--success)' },
    warning: { color: 'var(--warn)' },
    error: { color: 'var(--danger)' },
    info: { color: 'var(--info)' },
  };

  const trendColorClasses = {
    up: { color: 'var(--success)' },
    down: { color: 'var(--danger)' },
    neutral: { color: 'var(--dim)' },
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→',
  };

  return (
    <MDJCard 
      className={`${className} ${onClick ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}
    >
      <div className="flex items-start justify-between" onClick={onClick} role={onClick ? 'button' : undefined}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && (
              <span className="text-lg">{icon}</span>
            )}
            <h3 className="text-sm font-medium" style={{ color: 'var(--dim)' }}>{title}</h3>
          </div>
          
          <div className="text-2xl font-bold mb-1" style={colorClasses[color]}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--dim)' }}>{subtitle}</p>
          )}
        </div>
        
        {trend && (
          <div className="text-right" style={trendColorClasses[trend.direction]}>
            <div className="flex items-center gap-1 text-sm">
              <span>{trendIcons[trend.direction]}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
            {trend.label && (
              <div className="text-xs mt-1" style={{ color: 'var(--dim)' }}>{trend.label}</div>
            )}
          </div>
        )}
      </div>
    </MDJCard>
  );
} 
