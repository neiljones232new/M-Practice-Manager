'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MDJSection, MDJCard, MDJButton, MDJBadge, MDJLoader } from '@/components/mdj-ui';
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
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  ref: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

export default function CalendarEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);

      const eventData: any = await api.get(`/calendar/events/${eventId}`);
      setEvent(eventData as any);

      // Fetch related client if exists
      if (eventData.clientId) {
        try {
          const clientData = await api.get(`/clients/${eventData.clientId}`).catch(() => null);
          if (clientData) {
            setClient(clientData as any);
          }
        } catch (err) {
          console.error('Failed to fetch client:', err);
        }
      }

      // Fetch related task if exists
      if (eventData.taskId) {
        try {
          const taskData = await api.get(`/tasks/${eventData.taskId}`).catch(() => null);
          if (taskData) {
            setTask(taskData as any);
          }
        } catch (err) {
          console.error('Failed to fetch task:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      
      await api.delete(`/calendar/events/${event.id}`);

      router.push('/calendar');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!event) return;

    try {
      const updatedEvent: any = await api.put(`/calendar/events/${event.id}`, { status: newStatus });
      setEvent(updatedEvent as any);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update event status');
    }
  };

  const getEventTypeVariant = (type: string) => {
    switch (type) {
      case 'MEETING': return 'info';
      case 'DEADLINE': return 'error';
      case 'REMINDER': return 'warning';
      case 'APPOINTMENT': return 'success';
      case 'FILING': return 'default';
      default: return 'default';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'info';
      case 'CONFIRMED': return 'success';
      case 'CANCELLED': return 'default';
      case 'COMPLETED': return 'success';
      default: return 'default';
    }
  };

  const formatDateTime = (dateString: string, allDay: boolean) => {
    const date = new Date(dateString);
    
    if (allDay) {
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startDate: string, endDate: string, allDay: boolean) => {
    if (allDay) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays === 1 ? 'All day' : `${diffDays} days`;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) {
      return `${diffMinutes} minutes`;
    } else if (diffMinutes === 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `${diffHours}h ${diffMinutes}m`;
    }
  };

  if (loading) {
    return (
      <MDJShell pageTitle="Event" pageSubtitle="Loading" showBack backHref="/calendar" backLabel="Back to Calendar" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar', href: '/calendar' }, { label: 'Event' }]}>
        <div className="card-mdj">Loading…</div>
      </MDJShell>
    );
  }

  if (error || !event) {
    return (
      <MDJShell pageTitle="Event Not Found" pageSubtitle="" showBack backHref="/calendar" backLabel="Back to Calendar" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar', href: '/calendar' }, { label: 'Not Found' }]}>
        <div className="card-mdj">{error || 'The requested event could not be found.'}</div>
      </MDJShell>
    );
  }

  return (
    <MDJShell pageTitle={event.title} pageSubtitle="Calendar Event Details" showBack backHref="/calendar" backLabel="Back to Calendar" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar', href: '/calendar' }, { label: event.title }]}>
      <div className="page-content space-y-6">
        {/* Header */}
        <MDJSection
          title={event.title}
          subtitle="Calendar Event Details"
          actions={
            <div className="flex items-center gap-2">
              <MDJButton
                variant="outline"
                onClick={() => router.push(`/calendar/events/${event.id}/edit`)}
              >
                Edit
              </MDJButton>
              <MDJButton
                variant="outline"
                onClick={handleDelete}
                loading={deleting}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
              >
                Delete
              </MDJButton>
              <MDJButton
                variant="ghost"
                onClick={() => router.push('/calendar')}
              >
                Back to Calendar
              </MDJButton>
            </div>
          }
        >
          <div />
        </MDJSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <MDJCard title="Event Information" padding="lg">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MDJBadge variant={getEventTypeVariant(event.type)}>
                    {event.type}
                  </MDJBadge>
                  <MDJBadge variant={getStatusVariant(event.status)}>
                    {event.status}
                  </MDJBadge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-gray-500 mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium">
                        {formatDateTime(event.startDate, event.allDay)}
                      </div>
                      {event.startDate !== event.endDate && (
                        <div className="text-sm text-gray-600">
                          to {formatDateTime(event.endDate, event.allDay)}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Duration: {formatDuration(event.startDate, event.endDate, event.allDay)}
                      </div>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-start gap-3">
                      <div className="text-gray-500 mt-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-gray-600">{event.location}</div>
                      </div>
                    </div>
                  )}

                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="text-gray-500 mt-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Attendees ({event.attendees.length})</div>
                        <div className="text-gray-600">
                          {event.attendees.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {event.description && (
                  <div className="pt-4 border-t">
                    <div className="font-medium mb-2">Description</div>
                    <div className="text-gray-600 whitespace-pre-wrap">
                      {event.description}
                    </div>
                  </div>
                )}
              </div>
            </MDJCard>

            {/* Quick Actions */}
            {event.status === 'SCHEDULED' && (
              <MDJCard title="Quick Actions" padding="lg">
                <div className="flex flex-wrap gap-2">
                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate('CONFIRMED')}
                  >
                    Mark as Confirmed
                  </MDJButton>
                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate('COMPLETED')}
                  >
                    Mark as Completed
                  </MDJButton>
                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate('CANCELLED')}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    Cancel Event
                  </MDJButton>
                </div>
              </MDJCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Client */}
            {client && (
              <MDJCard title="Related Client" padding="lg">
                <div className="space-y-3">
                  <div>
                    <button
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="text-lg font-medium hover:underline"
                      style={{ color: 'var(--gold)' }}
                    >
                      {client.ref}
                    </button>
                    <div className="text-gray-600">{client.name}</div>
                  </div>
                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="w-full"
                  >
                    View Client Details
                  </MDJButton>
                </div>
              </MDJCard>
            )}

            {/* Related Task */}
            {task && (
              <MDJCard title="Related Task" padding="lg">
                <div className="space-y-3">
                  <div>
                    <button
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--gold)' }}
                    >
                      {task.title}
                    </button>
                    <div className="text-sm text-gray-600">
                      Status: <MDJBadge variant="info" size="sm">{task.status}</MDJBadge>
                    </div>
                  </div>
                  <MDJButton
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="w-full"
                  >
                    View Task Details
                  </MDJButton>
                </div>
              </MDJCard>
            )}

            {/* Event Metadata */}
            <MDJCard title="Event Details" padding="lg">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Created</div>
                  <div className="text-gray-600">
                    {new Date(event.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Last Updated</div>
                  <div className="text-gray-600">
                    {new Date(event.updatedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Event ID</div>
                  <div className="text-gray-600 font-mono text-xs">{event.id}</div>
                </div>
              </div>
            </MDJCard>
          </div>
        </div>
      </div>
    </MDJShell>
  );
}
