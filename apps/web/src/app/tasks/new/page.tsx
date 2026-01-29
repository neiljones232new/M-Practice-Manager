'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MDJLayout from '@/components/mdj-ui/MDJLayout';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea } from '@/components/mdj-ui';
import { api } from '@/lib/api';
import type { Client, Service } from '@/lib/types';

interface Task {
  id: string;
}

interface CreateTaskDto {
  clientId: string;
  serviceId?: string;
  title: string;
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

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateTaskDto>({
    clientId: '',
    title: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    tags: [],
  });

  useEffect(() => {
    fetchClients();
    
    // Pre-populate from template if query params exist
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const priority = searchParams.get('priority');
    const tags = searchParams.get('tags');
    const serviceIdParam = searchParams.get('serviceId');

    if (title || description || priority || tags || serviceIdParam) {
      setFormData(prev => ({
        ...prev,
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }),
        ...(tags && { tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) }),
        ...(serviceIdParam && { serviceId: serviceIdParam }),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (formData.clientId) {
      fetchClientServices(formData.clientId);
    } else {
      setServices([]);
    }
  }, [formData.clientId]);

  const fetchClients = async () => {
    try {
      const data = await api.getClients();
      const items = Array.isArray(data) ? data : [];
      setClients(items.map((c: any) => c.node ?? c));
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchClientServices = async (clientId: string) => {
    try {
      const data = await api.get('/services', { params: { clientId } });
      setServices(data);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  const handleInputChange = (field: keyof CreateTaskDto, value: any) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.title) {
      setError('Client and title are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const task = await api.post<Task>('/tasks', {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      });
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: `${client.ref} - ${client.name}`,
  }));

  const serviceOptions = [
    { value: '', label: 'No specific service' },
    ...services.map(service => ({
      value: service.id,
      label: `${service.kind} (${service.frequency})`,
    })),
  ];

  return (
    <MDJLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <MDJSection
          title="Create New Task"
          subtitle="Add a new task to track work and deadlines"
          actions={
            <MDJButton
              variant="ghost"
              onClick={() => router.back()}
            >
              Cancel
            </MDJButton>
          }
        >
          <></>
        </MDJSection>

        <form onSubmit={handleSubmit}>
          <MDJCard title="Task Details" padding="lg">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Client *
                </label>
                <MDJSelect
                  placeholder="Select a client"
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  options={clientOptions}
                  required
                />
              </div>

              {/* Service Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Related Service
                </label>
                <MDJSelect
                  placeholder="Select a service (optional)"
                  value={formData.serviceId || ''}
                  onChange={(e) => handleInputChange('serviceId', e.target.value || undefined)}
                  options={serviceOptions}
                  disabled={!formData.clientId}
                />
                <div className="text-xs mt-2" style={{ color: 'var(--dim-light)' }}>
                  Link this task to a service if it's part of service delivery workflow (e.g., preparing accounts, chasing records). 
                  Leave blank for standalone tasks that aren't tied to a specific service.
                </div>
              </div>

              {/* Task Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Task Title *
                </label>
                <MDJInput
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Task Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <MDJTextarea
                  placeholder="Enter task description (optional)"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Due Date */}
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

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Assignee
                </label>
                <MDJInput
                  placeholder="Enter assignee name"
                  value={formData.assignee || ''}
                  onChange={(e) => handleInputChange('assignee', e.target.value)}
                />
              </div>

              {/* Priority */}
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

              {/* Status */}
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

              {/* Tags */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Tags
                </label>
                <MDJInput
                  placeholder="Enter tags separated by commas"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                />
                <div className="text-xs mt-1" style={{ color: 'var(--dim-light)' }}>
                  Separate multiple tags with commas
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <MDJButton
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </MDJButton>
              
              <MDJButton
                type="submit"
                variant="primary"
                loading={loading}
              >
                Create Task
              </MDJButton>
            </div>
          </MDJCard>
        </form>
      </div>
    </MDJLayout>
  );
}
