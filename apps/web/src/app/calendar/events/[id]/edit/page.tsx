'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MDJSection, MDJCard, MDJButton, MDJInput, MDJSelect, MDJTextarea, MDJLoader } from '@/components/mdj-ui';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  clientId?: string;
  taskId?: string;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  location?: string;
  attendees?: string[];
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

interface UpdateCalendarEventDto {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  clientId?: string;
  taskId?: string;
  type?: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  location?: string;
  attendees?: string[];
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

interface Client {
  id: string;
  ref: string;
  name: string;
  portfolioCode: number;
}

interface Task {
  id: string;
  title: string;
  clientId: string;
}

const EVENT_TYPES = [
  { value: 'MEETING', label: 'Meeting' },
  { value: 'DEADLINE', label: 'Deadline' },
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'FILING', label: 'Filing' },
];

const EVENT_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function EditCalendarEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UpdateCalendarEventDto>({});
  const [attendeesInput, setAttendeesInput] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchClients();
    }
  }, [eventId]);

  useEffect(() => {
    if (formData.clientId) {
      fetchTasksForClient(formData.clientId);
    } else {
      setTasks([]);
    }
  }, [formData.clientId]);

  const fetchEvent = async () => {
    try {
      const eventData: any = await api.get(`/calendar/events/${eventId}`);
      setEvent(eventData as any);
      
      // Convert dates for form inputs
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);
      
      const formattedFormData: UpdateCalendarEventDto = {
        title: eventData.title,
        description: eventData.description || '',
        allDay: eventData.allDay,
        clientId: eventData.clientId || '',
        taskId: eventData.taskId || '',
        type: eventData.type,
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        status: eventData.status,
      };

      if (eventData.allDay) {
        formattedFormData.startDate = startDate.toISOString().split('T')[0];
        formattedFormData.endDate = endDate.toISOString().split('T')[0];
      } else {
        formattedFormData.startDate = startDate.toISOString().slice(0, 16);
        formattedFormData.endDate = endDate.toISOString().slice(0, 16);
      }
      
      setFormData(formattedFormData);
      setAttendeesInput((eventData.attendees || []).join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await api.get('/clients');
      setClients(data as any);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchTasksForClient = async (clientId: string) => {
    try {
      const data = await api.get(`/tasks?clientId=${clientId}&status=OPEN&status=IN_PROGRESS`);
      setTasks(data as any);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const handleInputChange = (field: keyof UpdateCalendarEventDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Auto-set end date when start date changes for all-day events
    if (field === 'startDate' && formData.allDay && value) {
      setFormData(prev => ({
        ...prev,
        endDate: value,
      }));
    }

    // Auto-set end date when start date changes for non-all-day events (1 hour later)
    if (field === 'startDate' && !formData.allDay && value) {
      const startDate = new Date(value);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      setFormData(prev => ({
        ...prev,
        endDate: endDate.toISOString().slice(0, 16),
      }));
    }
  };

  const handleAllDayToggle = (allDay: boolean) => {
    setFormData(prev => {
      const newData = { ...prev, allDay };
      
      if (allDay && prev.startDate) {
        // Convert to date-only format
        const startDate = new Date(prev.startDate);
        newData.startDate = startDate.toISOString().split('T')[0];
        newData.endDate = startDate.toISOString().split('T')[0];
      } else if (!allDay && prev.startDate) {
        // Convert to datetime format
        const startDate = new Date(prev.startDate);
        startDate.setHours(9, 0, 0, 0); // Default to 9 AM
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
        newData.startDate = startDate.toISOString().slice(0, 16);
        newData.endDate = endDate.toISOString().slice(0, 16);
      }
      
      return newData;
    });
  };

  const handleAttendeesChange = (value: string) => {
    setAttendeesInput(value);
    const attendees = value
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    setFormData(prev => ({
      ...prev,
      attendees,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }

    if (!formData.endDate) {
      setError('End date is required');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare the data
      const eventData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        clientId: formData.clientId || undefined,
        taskId: formData.taskId || undefined,
        attendees: formData.attendees?.length ? formData.attendees : undefined,
      };

      // Convert dates to ISO format
      if (formData.allDay) {
        eventData.startDate = new Date(formData.startDate + 'T00:00:00').toISOString();
        eventData.endDate = new Date(formData.endDate + 'T23:59:59').toISOString();
      } else {
        eventData.startDate = new Date(formData.startDate).toISOString();
        eventData.endDate = new Date(formData.endDate).toISOString();
      }

      await api.put(`/calendar/events/${eventId}`, eventData);

      router.push(`/calendar/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: `${client.ref} - ${client.name}`,
  }));

  const taskOptions = tasks.map(task => ({
    value: task.id,
    label: task.title,
  }));

  if (loading) {
    return (
      <MDJShell pageTitle="Edit Event" pageSubtitle="Loading" showBack backHref={`/calendar/events/${eventId}`} backLabel="Back to Event" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar', href: '/calendar' }, { label: 'Edit' }]}>
        <div className="card-mdj">Loading…</div>
      </MDJShell>
    );
  }

  if (error && !event) {
    return (
      <MDJShell pageTitle="Edit Event" pageSubtitle="Error" showBack backHref={`/calendar/events/${eventId}`} backLabel="Back to Event" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar', href: '/calendar' }, { label: 'Edit' }]}>
        <div className="card-mdj" style={{ color: 'var(--danger)' }}>{error}</div>
      </MDJShell>
    );
  }

  return (
    <MDJShell pageTitle="Edit Event" pageSubtitle={event?.title || ''} showBack backHref={`/calendar/events/${eventId}`} backLabel="Back to Event" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar', href: '/calendar' }, { label: 'Edit' }]}>
      <div className="page-content max-w-2xl mx-auto">
        <MDJSection
          title="Edit Calendar Event"
          subtitle={`Editing: ${event?.title}`}
          actions={
            <MDJButton
              variant="ghost"
              onClick={() => router.push(`/calendar/events/${eventId}`)}
            >
              Cancel
            </MDJButton>
          }
        >
          <MDJCard>
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="text-red-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <MDJInput
                    label="Event Title"
                    required
                    value={formData.title || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
                    placeholder="Enter event title"
                  />
                </div>

                <MDJSelect
                  label="Event Type"
                  required
                  value={formData.type || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('type', e.target.value)}
                  options={EVENT_TYPES}
                />

                <MDJSelect
                  label="Status"
                  value={formData.status || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('status', e.target.value)}
                  options={EVENT_STATUSES}
                />

                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="allDay"
                      checked={formData.allDay || false}
                      onChange={(e) => handleAllDayToggle(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="allDay" className="text-sm font-medium">
                      All Day Event
                    </label>
                  </div>
                </div>

                <MDJInput
                  label="Start Date"
                  required
                  type={formData.allDay ? 'date' : 'datetime-local'}
                  value={formData.startDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('startDate', e.target.value)}
                />

                <MDJInput
                  label="End Date"
                  required
                  type={formData.allDay ? 'date' : 'datetime-local'}
                  value={formData.endDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('endDate', e.target.value)}
                />

                <MDJSelect
                  label="Client (Optional)"
                  value={formData.clientId || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('clientId', e.target.value)}
                  options={[{ value: '', label: 'No client selected' }, ...clientOptions]}
                />

                <MDJSelect
                  label="Related Task (Optional)"
                  value={formData.taskId || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('taskId', e.target.value)}
                  options={[{ value: '', label: 'No task selected' }, ...taskOptions]}
                  disabled={!formData.clientId}
                />

                <div className="md:col-span-2">
                  <MDJInput
                    label="Location (Optional)"
                    value={formData.location || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('location', e.target.value)}
                    placeholder="Enter location or meeting link"
                  />
                </div>

                <div className="md:col-span-2">
                  <MDJInput
                    label="Attendees (Optional)"
                    value={attendeesInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAttendeesChange(e.target.value)}
                    placeholder="Enter email addresses separated by commas"
                    helperText="Separate multiple email addresses with commas"
                  />
                </div>

                <div className="md:col-span-2">
                  <MDJTextarea
                    label="Description (Optional)"
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                    placeholder="Enter event description or notes"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <MDJButton
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/calendar/events/${eventId}`)}
                  disabled={saving}
                >
                  Cancel
                </MDJButton>
                <MDJButton
                  type="submit"
                  variant="primary"
                  loading={saving}
                >
                  Save Changes
                </MDJButton>
              </div>
            </form>
          </MDJCard>
        </MDJSection>
      </div>
    </MDJShell>
  );
}
