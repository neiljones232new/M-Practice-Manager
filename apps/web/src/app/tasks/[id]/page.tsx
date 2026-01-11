'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { ExportMenu } from '@/components/mdj-ui/ExportMenu';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea, MDJBadge } from '@/components/mdj-ui';
import { api } from '@/lib/api';
import type { Task, Client, Service } from '@/lib/types';

interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: string;
  assignee?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}

const TASK_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateTaskDto>({});

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);

      const taskData = await api.get<Task>(`/tasks/${taskId}`);
      setTask(taskData);
      setFormData({
        title: taskData.title || '',
        description: taskData.description || '',
        dueDate: taskData.dueDate ? taskData.dueDate.split('T')[0] : '',
        assignee: taskData.assignee || '',
        status: (taskData.status as any) || 'OPEN',
        priority: (taskData.priority as any) || 'MEDIUM',
        tags: taskData.tags || [],
      });

      // Fetch client details
      const clientData = await api.get<Client>(`/clients/${taskData.clientId}`).catch(() => null);
      if (clientData) {
        setClient(clientData);
      }

      // Fetch service details if available
      if (taskData.serviceId) {
        const serviceData = await api.get<Service>(`/services/${taskData.serviceId}`).catch(() => null);
        if (serviceData) {
          setService(serviceData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateTaskDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags,
    }));
  };

  const handleSave = async () => {
    if (!task) return;

    try {
      setSaving(true);
      setError(null);

      const updatedTask = await api.put<Task>(`/tasks/${taskId}`, {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      });
      setTask(updatedTask);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Are you sure you want to delete this task?')) return;

    try {
      setSaving(true);
      setError(null);

      await api.delete(`/tasks/${taskId}`);
      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'default';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'URGENT': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return (
      <MDJShell pageTitle="Task" pageSubtitle="Loading" showBack backHref="/tasks" backLabel="Back to Tasks" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks', href: '/tasks' }, { label: 'Task' }]}>
        <div className="card-mdj">Loading…</div>
      </MDJShell>
    );
  }

  if (error || !task) {
    return (
      <MDJShell pageTitle="Task" pageSubtitle="Error" showBack backHref="/tasks" backLabel="Back to Tasks" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks', href: '/tasks' }, { label: 'Error' }]}>
        <div className="card-mdj">
          <div style={{ color: 'var(--danger)' }}>{error || 'Task not found'}</div>
        </div>
      </MDJShell>
    );
  }

  return (
    <MDJShell pageTitle={task.title} pageSubtitle={`Task #${task.id.slice(-8)}`} showBack backHref="/tasks" backLabel="Back to Tasks" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks', href: '/tasks' }, { label: task.title }]}>
      <div className="page-content space-y-6">
        <MDJSection
          title={task.title}
          subtitle={`Task #${task.id.slice(-8)}`}
          actions={
            <div className="flex gap-2">
              <ExportMenu
                onPDF={() => window.print()}
                onCSV={async () => {
                  try {
                    const csv = await api.get<string>(`/tasks/export.csv?serviceId=${encodeURIComponent(task.serviceId || '')}`);
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `task-${task.id}.csv`; a.click(); URL.revokeObjectURL(url);
                  } catch (e: any) { alert(e?.message || 'CSV export failed'); }
                }}
                onXLSX={async () => {
                  try {
                    const data = await api.get<any>(`/tasks/export.xlsx?serviceId=${encodeURIComponent(task.serviceId || '')}`);
                    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `task-${task.id}.xlsx`; a.click(); URL.revokeObjectURL(url);
                  } catch (e: any) { alert(e?.message || 'Excel export failed'); }
                }}
              />
              {!isEditing ? (
                <>
                  <MDJButton
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Task
                  </MDJButton>
                  <MDJButton
                    variant="ghost"
                    onClick={() => router.push('/tasks')}
                  >
                    Back to Tasks
                  </MDJButton>
                </>
              ) : (
                <>
                  <MDJButton
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                  >
                    Save Changes
                  </MDJButton>
                  <MDJButton
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        title: task.title || '',
                        description: task.description || '',
                        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
                        assignee: task.assignee || '',
                        status: (task.status as any) || 'OPEN',
                        priority: (task.priority as any) || 'MEDIUM',
                        tags: task.tags || [],
                      });
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </MDJButton>
                </>
              )}
            </div>
          }
        >
          <></>
        </MDJSection>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Task Details */}
          <div className="lg:col-span-2 space-y-6">
            <MDJCard title="Task Details" padding="lg">
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Task Title
                    </label>
                    <MDJInput
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <MDJTextarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Due Date
                      </label>
                      <MDJInput
                        type="date"
                        value={formData.dueDate || ''}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Assignee
                      </label>
                      <MDJInput
                        value={formData.assignee || ''}
                        onChange={(e) => handleInputChange('assignee', e.target.value)}
                        placeholder="Enter assignee name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Priority
                      </label>
                      <MDJSelect
                        value={formData.priority || 'MEDIUM'}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        options={TASK_PRIORITIES}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Status
                      </label>
                      <MDJSelect
                        value={formData.status || 'OPEN'}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        options={TASK_STATUSES}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tags
                    </label>
                    <MDJInput
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => handleTagsChange(e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {task.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--dim-light)' }}>
                        {task.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Due Date</h4>
                      <p className={`text-sm ${isOverdue(task.dueDate) ? 'text-red-500 font-medium' : ''}`}>
                        {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate) && ' (Overdue)'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Assignee</h4>
                      <p className="text-sm" style={{ color: 'var(--dim-light)' }}>
                        {task.assignee || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {(task.tags?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {(task.tags || []).map((tag, index) => (
                          <MDJBadge key={index} variant="default" size="sm">
                            {tag}
                          </MDJBadge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </MDJCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Priority */}
            <MDJCard title="Status & Priority" padding="md">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Status</h4>
                  <MDJBadge variant={(task.status === 'COMPLETED') ? 'success' : (task.status === 'CANCELLED' ? 'error' : (task.status === 'IN_PROGRESS' ? 'warning' : 'info'))}>
                    {task.status || 'OPEN'}
                  </MDJBadge>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Priority</h4>
                  <MDJBadge variant={((task.priority === 'HIGH' || task.priority === 'URGENT') ? 'warning' : 'info')}>
                    {task.priority || 'MEDIUM'}
                  </MDJBadge>
                </div>
              </div>
            </MDJCard>

            {/* Client Information */}
            {client && (
              <MDJCard title="Client" padding="md">
                <div className="space-y-2">
                  <button
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="text-left hover:underline"
                  >
                    <div className="font-mono text-sm" style={{ color: 'var(--gold)' }}>
                      {client.ref}
                    </div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs" style={{ color: 'var(--dim-light)' }}>
                      Portfolio {client.portfolioCode}
                    </div>
                  </button>
                </div>
              </MDJCard>
            )}

            {/* Service Information */}
            {service && (
              <MDJCard title="Related Service" padding="md">
                <div className="space-y-2">
                  <div className="font-medium">{service.kind}</div>
                  <div className="text-sm" style={{ color: 'var(--dim-light)' }}>
                    {service.frequency}
                  </div>
                </div>
              </MDJCard>
            )}

            {/* Task Metadata */}
            <MDJCard title="Task Info" padding="md">
              <div className="space-y-3 text-sm">
                <div>
                  <span style={{ color: 'var(--dim-light)' }}>Created:</span>
                  <div>{task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-GB') : '—'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--dim-light)' }}>Updated:</span>
                  <div>{task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('en-GB') : '—'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--dim-light)' }}>Task ID:</span>
                  <div className="font-mono text-xs">{task.id}</div>
                </div>
              </div>
            </MDJCard>

            {/* Actions */}
            <MDJCard title="Actions" padding="md">
              <div className="space-y-2">
                <MDJButton
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => router.push(`/tasks/new?clientId=${task.clientId}`)}
                >
                  Create Similar Task
                </MDJButton>
                
                <MDJButton
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete Task
                </MDJButton>
              </div>
            </MDJCard>
          </div>
        </div>
      </div>
    </MDJShell>
  );
}
