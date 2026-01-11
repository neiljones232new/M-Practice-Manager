'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import MDJShell from '@/components/mdj-ui/MDJShell';
import {
  MDJCard,
  MDJButton,
  MDJInput,
  MDJSelect,
  MDJTextarea,
} from '@/components/mdj-ui';

import { api } from '@/lib/api';
import type { Client, Task } from '@/lib/types';

interface CreateCalendarEventDto {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  clientId?: string;
  taskId?: string;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'APPOINTMENT' | 'FILING';
  location?: string;
  attendees?: string[];
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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

export default function NewCalendarEventPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendeesInput, setAttendeesInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCalendarEventDto>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    allDay: false,
    clientId: '',
    taskId: '',
    type: 'MEETING',
    location: '',
    attendees: [],
    status: 'SCHEDULED',
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Could not load clients', err);
    }
  }

  useEffect(() => {
    if (formData.clientId) {
      loadTasks(formData.clientId);
    } else {
      setTasks([]);
    }
  }, [formData.clientId]);

  async function loadTasks(clientId: string) {
    try {
      const data = await api.getTasks({ clientId });
      setTasks(data);
    } catch {
      setTasks([]);
    }
  }

  const updateField = (field: keyof CreateCalendarEventDto, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleAttendees = (value: string) => {
    setAttendeesInput(value);
    const parts = value.split(',').map(x => x.trim()).filter(Boolean);
    updateField('attendees', parts);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title) return setError('Title required');
    if (!formData.startDate) return setError('Start date required');

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
      };

      const created = await api.post('/calendar/events', payload);
      router.push(`/calendar`);
    } catch (err) {
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MDJShell
      pageTitle="New Calendar Event"
      pageSubtitle="Create a new appointment, meeting or deadline"
      breadcrumbs={[
        { label: 'Calendar', href: '/calendar' },
        { label: 'New Event' },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        <MDJCard>
          <form onSubmit={submit} className="space-y-6 p-6">
            {error && (
              <div className="bg-red-50 border border-red-300 p-3 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <MDJInput
              label="Title"
              required
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MDJInput
                label="Start Date"
                type="datetime-local"
                required
                value={formData.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
              />

              <MDJInput
                label="End Date"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
              />
            </div>

            <MDJSelect
              label="Event Type"
              value={formData.type}
              options={EVENT_TYPES}
              onChange={(e) => updateField('type', e.target.value)}
            />

            <MDJSelect
              label="Status"
              value={formData.status}
              options={EVENT_STATUSES}
              onChange={(e) => updateField('status', e.target.value)}
            />

            <MDJSelect
              label="Client"
              value={formData.clientId}
              options={[{ value: '', label: 'None' }, ...clients.map(c => ({ value: c.id, label: `${c.ref} - ${c.name}` }))]}
              onChange={(e) => updateField('clientId', e.target.value)}
            />

            <MDJSelect
              label="Task"
              disabled={!formData.clientId}
              value={formData.taskId}
              options={[{ value: '', label: 'None' }, ...tasks.map(t => ({ value: t.id, label: t.title }))]}
              onChange={(e) => updateField('taskId', e.target.value)}
            />

            <MDJInput
              label="Location"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
            />

            <MDJInput
              label="Attendees"
              value={attendeesInput}
              placeholder="email1@example.com, email2@example.com"
              onChange={(e) => handleAttendees(e.target.value)}
            />

            <MDJTextarea
              label="Description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <MDJButton
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </MDJButton>

              <MDJButton type="submit" variant="primary" loading={loading}>
                Create Event
              </MDJButton>
            </div>
          </form>
        </MDJCard>
      </div>
    </MDJShell>
  );
}