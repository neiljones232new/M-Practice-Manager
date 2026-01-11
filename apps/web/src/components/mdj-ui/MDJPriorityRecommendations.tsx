import React from 'react';
import { MDJCard, MDJBadge } from './index';

interface UrgentTask {
  id: string;
  title: string;
  reason: string;
  daysOverdue?: number;
  clientName?: string;
}

interface ComplianceFlag {
  id: string;
  type: string;
  reason: string;
  daysUntilDue?: number;
  clientName?: string;
}

interface BusinessInsight {
  type: 'revenue' | 'efficiency' | 'risk' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface MDJPriorityRecommendationsProps {
  urgentTasks?: UrgentTask[];
  complianceFlags?: ComplianceFlag[];
  businessInsights?: BusinessInsight[];
  onTaskClick?: (taskId: string) => void;
  onComplianceClick?: (complianceId: string) => void;
}

export function MDJPriorityRecommendations({
  urgentTasks = [],
  complianceFlags = [],
  businessInsights = [],
  onTaskClick,
  onComplianceClick
}: MDJPriorityRecommendationsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'revenue': return '💰';
      case 'efficiency': return '⚡';
      case 'risk': return '⚠️';
      case 'opportunity': return '🎯';
      default: return '💡';
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Urgent Tasks */}
      {urgentTasks.length > 0 && (
        <MDJCard title="🚨 Urgent Tasks" className="border-red-500">
          <div className="space-y-3">
            {urgentTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded border transition-colors ${
                  onTaskClick ? 'cursor-pointer hover:opacity-80' : ''
                }`}
                style={{
                  borderColor: 'var(--danger)',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                }}
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium truncate flex-1" style={{ color: 'var(--text-light)' }}>
                    {task.title}
                  </h4>
                  {task.daysOverdue && (
                    <MDJBadge variant="error" size="sm" className="ml-2">
                      {task.daysOverdue}d overdue
                    </MDJBadge>
                  )}
                </div>
                
                <p className="text-xs mb-1" style={{ color: 'var(--danger)' }}>{task.reason}</p>
                
                {task.clientName && (
                  <p className="text-xs" style={{ color: 'var(--dim-light)' }}>Client: {task.clientName}</p>
                )}
              </div>
            ))}
            
            {urgentTasks.length > 3 && (
              <button
                onClick={() => onTaskClick?.('all-urgent')}
                className="text-xs hover:underline"
                style={{ color: 'var(--danger)' }}
              >
                View all {urgentTasks.length} urgent tasks →
              </button>
            )}
          </div>
        </MDJCard>
      )}

      {/* Compliance Flags */}
      {complianceFlags.length > 0 && (
        <MDJCard title="⚠️ Compliance Flags" className="border-orange-500">
          <div className="space-y-3">
            {complianceFlags.slice(0, 3).map((flag) => (
              <div
                key={flag.id}
                className={`p-3 rounded border transition-colors ${
                  onComplianceClick ? 'cursor-pointer hover:opacity-80' : ''
                }`}
                style={{
                  borderColor: 'var(--warn)',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                }}
                onClick={() => onComplianceClick?.(flag.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium truncate flex-1" style={{ color: 'var(--text-light)' }}>
                    {flag.type}
                  </h4>
                  {flag.daysUntilDue !== undefined && (
                    <MDJBadge 
                      variant={flag.daysUntilDue < 0 ? 'error' : 'warning'} 
                      size="sm" 
                      className="ml-2"
                    >
                      {flag.daysUntilDue < 0 
                        ? `${Math.abs(flag.daysUntilDue)}d overdue`
                        : `${flag.daysUntilDue}d left`
                      }
                    </MDJBadge>
                  )}
                </div>
                
                <p className="text-xs mb-1" style={{ color: 'var(--warn)' }}>{flag.reason}</p>
                
                {flag.clientName && (
                  <p className="text-xs" style={{ color: 'var(--dim-light)' }}>Client: {flag.clientName}</p>
                )}
              </div>
            ))}
            
            {complianceFlags.length > 3 && (
              <button
                onClick={() => onComplianceClick?.('all-flags')}
                className="text-xs hover:underline"
                style={{ color: 'var(--warn)' }}
              >
                View all {complianceFlags.length} compliance flags →
              </button>
            )}
          </div>
        </MDJCard>
      )}

      {/* Business Insights */}
      {businessInsights.length > 0 && (
        <MDJCard title="💡 Business Insights">
          <div className="space-y-3">
            {businessInsights.map((insight, index) => (
              <div
                key={index}
                className="p-3 rounded border"
                style={{ borderColor: 'var(--border-light)' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getInsightIcon(insight.type)}</span>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium" style={{ color: 'var(--text-light)' }}>
                        {insight.title}
                      </h4>
                      <MDJBadge 
                        variant={getInsightColor(insight.impact)} 
                        size="sm"
                      >
                        {insight.impact} impact
                      </MDJBadge>
                    </div>
                    
                    <p className="text-xs" style={{ color: 'var(--dim-light)' }}>
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MDJCard>
      )}

      {/* No recommendations */}
      {urgentTasks.length === 0 && complianceFlags.length === 0 && businessInsights.length === 0 && (
        <MDJCard title="✅ All Clear">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-light)' }}>
              No urgent items!
            </h3>
            <p style={{ color: 'var(--dim-light)' }}>
              Your practice is running smoothly with no urgent tasks or compliance flags.
            </p>
          </div>
        </MDJCard>
      )}
    </div>
  );
}
