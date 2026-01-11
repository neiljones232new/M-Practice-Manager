'use client';
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { MDJButton, MDJCard, MDJBadge } from './index';

interface ServerStatus {
  isOnline: boolean;
  mode: 'native' | 'docker' | 'hybrid';
  services: {
    api: {
      status: 'running' | 'stopped' | 'error';
      port?: number;
      pid?: number;
    };
    database?: {
      status: 'running' | 'stopped' | 'error';
      container?: string;
      port?: number;
    };
    redis?: {
      status: 'running' | 'stopped' | 'error';
      container?: string;
      port?: number;
    };
  };
  lastSnapshot?: string;
  uptime?: number;
}

interface MDJServerStatusProps {
  onStartDocker?: () => Promise<void>;
  onStopDocker?: () => Promise<void>;
  onRestartDocker?: () => Promise<void>;
  onCreateSnapshot?: () => Promise<void>;
  className?: string;
  compact?: boolean;
}

export const MDJServerStatus: React.FC<MDJServerStatusProps> = ({
  onStartDocker,
  onStopDocker,
  onRestartDocker,
  onCreateSnapshot,
  className,
  compact = false,
}) => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.get<ServerStatus>('/assist/server/status');
      setStatus(data);
    } catch (error) {
      console.error('Error fetching server status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: string, handler?: () => Promise<void>) => {
    if (!handler) return;
    
    setActionLoading(action);
    try {
      await handler();
      await fetchStatus(); // Refresh status after action
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = (serviceStatus: 'running' | 'stopped' | 'error') => {
    const variants = {
      running: 'success',
      stopped: 'default',
      error: 'error',
    } as const;

    return (
      <MDJBadge variant={variants[serviceStatus]} size="sm">
        {serviceStatus}
      </MDJBadge>
    );
  };

  if (loading) {
    return (
      <MDJCard className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-primary)' }} />
        </div>
      </MDJCard>
    );
  }

  if (!status) {
    return (
      <MDJCard className={className}>
        <div className="text-center py-8">
          <p style={{ color: 'var(--dim-light)' }}>Unable to load server status</p>
        </div>
      </MDJCard>
    );
  }

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: status.isOnline ? 'var(--success)' : 'var(--danger)',
            }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-light)' }}>
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <MDJBadge variant="default" size="sm">
          {status.mode}
        </MDJBadge>
        
        {status.uptime && (
          <span className="text-xs" style={{ color: 'var(--dim-light)' }}>
            {formatUptime(status.uptime)}
          </span>
        )}
      </div>
    );
  }

  return (
    <MDJCard title="Server Status" className={className}>
      <div className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{
                background: status.isOnline ? 'var(--success)' : 'var(--danger)',
              }}
            />
            <div>
              <p className="font-medium" style={{ color: 'var(--text-light)' }}>
                {status.isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-sm" style={{ color: 'var(--dim-light)' }}>
                Mode: {status.mode} • Uptime: {formatUptime(status.uptime)}
              </p>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="space-y-3">
          <h4 className="font-medium" style={{ color: 'var(--brand-primary)' }}>
            Services
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {/* API Service */}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--elev-light)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-light)' }}>
                  API Server
                </p>
                <p className="text-sm" style={{ color: 'var(--dim-light)' }}>
                  Port: {status.services.api.port} • PID: {status.services.api.pid}
                </p>
              </div>
              {getStatusBadge(status.services.api.status)}
            </div>

            {/* Database Service */}
            {status.services.database && (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--elev-light)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-light)' }}>
                    Database
                  </p>
                  <p className="text-sm" style={{ color: 'var(--dim-light)' }}>
                    Container: {status.services.database.container} • Port: {status.services.database.port}
                  </p>
                </div>
                {getStatusBadge(status.services.database.status)}
              </div>
            )}

            {/* Redis Service */}
            {status.services.redis && (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--elev-light)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-light)' }}>
                    Redis Cache
                  </p>
                  <p className="text-sm" style={{ color: 'var(--dim-light)' }}>
                    Container: {status.services.redis.container} • Port: {status.services.redis.port}
                  </p>
                </div>
                {getStatusBadge(status.services.redis.status)}
              </div>
            )}
          </div>
        </div>

        {/* Docker Controls */}
        {status.mode !== 'native' && (
          <div className="space-y-3">
            <h4 className="font-medium" style={{ color: 'var(--brand-primary)' }}>
              Docker Controls
            </h4>
            
            <div className="flex gap-2 flex-wrap">
              <MDJButton
                variant="outline"
                size="sm"
                onClick={() => handleAction('start', onStartDocker)}
                loading={actionLoading === 'start'}
                disabled={!!actionLoading}
              >
                Start Services
              </MDJButton>
              
              <MDJButton
                variant="outline"
                size="sm"
                onClick={() => handleAction('stop', onStopDocker)}
                loading={actionLoading === 'stop'}
                disabled={!!actionLoading}
              >
                Stop Services
              </MDJButton>
              
              <MDJButton
                variant="outline"
                size="sm"
                onClick={() => handleAction('restart', onRestartDocker)}
                loading={actionLoading === 'restart'}
                disabled={!!actionLoading}
              >
                Restart Services
              </MDJButton>
            </div>
          </div>
        )}

        {/* Snapshot Controls */}
        <div className="space-y-3">
          <h4 className="font-medium" style={{ color: 'var(--brand-primary)' }}>
            Data Management
          </h4>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-light)' }}>
                Last Snapshot
              </p>
              <p className="text-xs" style={{ color: 'var(--dim-light)' }}>
                {status.lastSnapshot 
                  ? new Date(status.lastSnapshot).toLocaleString()
                  : 'No snapshots created'
                }
              </p>
            </div>
            
            <MDJButton
              variant="outline"
              size="sm"
              onClick={() => handleAction('snapshot', onCreateSnapshot)}
              loading={actionLoading === 'snapshot'}
              disabled={!!actionLoading}
            >
              Create Snapshot
            </MDJButton>
          </div>
        </div>
      </div>
    </MDJCard>
  );
};
