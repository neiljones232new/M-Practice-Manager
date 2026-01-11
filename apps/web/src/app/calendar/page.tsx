'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MDJShell from '@/components/mdj-ui/MDJShell';
import { api } from '@/lib/api';
import { useClientData } from '@/hooks/useClientData';
import { ClientSelect } from '@/components/ClientSelect';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

type CalendarStatus = 'scheduled' | 'completed' | 'cancelled';

type CalendarType =
  | 'MEETING'
  | 'DEADLINE'
  | 'REMINDER'
  | 'APPOINTMENT'
  | 'FILING'
  | 'TASK'
  | 'OTHER';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  status: CalendarStatus;
  start: string; // ISO
  end?: string; // ISO
  location?: string;
  clientRef?: string;
  clientName?: string;
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: CalendarType | null;
}

const defaultNewEvent: Omit<CalendarEvent, 'id'> = {
  title: '',
  description: '',
  status: 'scheduled',
  start: new Date().toISOString().slice(0, 16),
  end: '',
  location: '',
  clientRef: '',
  type: 'OTHER',
};

function statusBadgeClass(status: CalendarStatus) {
  const base = 'badge';
  if (status === 'completed') return `${base} badge-success`;
  if (status === 'cancelled') return `${base} badge-danger`;
  return `${base} badge-gold`;
}

function typeColour(type: CalendarType | null | undefined): string {
  switch (type) {
    case 'MEETING':
      return '#2563eb'; // blue
    case 'DEADLINE':
      return '#dc2626'; // red
    case 'REMINDER':
      return '#10b981'; // green
    case 'APPOINTMENT':
      return '#7c3aed'; // purple
    case 'FILING':
      return '#f97316'; // orange
    case 'TASK':
      return '#0ea5e9'; // cyan / task
    case 'OTHER':
    default:
      return '#6b7280'; // grey
  }
}

function EventDetailCard({ event }: { event: CalendarEvent }) {
  if (!event) return null;

  const colour = typeColour((event.type as CalendarType) ?? 'OTHER');

  return (
    <div className="card-mdj h-full">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: colour }}
        />
        Event Details
      </h3>

      <div className="flex items-center gap-2 mb-3">
        <span className={statusBadgeClass(event.status)} style={{ textTransform: 'capitalize' }}>
          {event.status}
        </span>
        {event.type && (
          <span className="chip">
            Type:{' '}
            <span style={{ textTransform: 'capitalize' }}>
              {event.type.toLowerCase()}
            </span>
          </span>
        )}
        {event.clientRef && <span className="chip mono">Client: {event.clientRef}</span>}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">Title</div>
          <div className="font-medium">{event.title}</div>
        </div>

        {event.location && (
          <div>
            <div className="text-xs text-gray-500">Location</div>
            <div>{event.location}</div>
          </div>
        )}

        <div>
          <div className="text-xs text-gray-500">Start</div>
          <div>{new Date(event.start).toLocaleString()}</div>
        </div>

        {event.end && (
          <div>
            <div className="text-xs text-gray-500">End</div>
            <div>{new Date(event.end).toLocaleString()}</div>
          </div>
        )}

        {event.description && (
          <div>
            <div className="text-xs text-gray-500">Description</div>
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | CalendarStatus>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState(defaultNewEvent);

  // Edit and delete state management (Task 1)
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Task 10: Success and error feedback state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Task 3: Import and use useClientData hook (Requirement 2.1)
  const { fetchClientByRef } = useClientData();

  useEffect(() => {
    loadEvents();
  }, []);

  // Task 2.1: Switch to edit mode
  function handleEditClick() {
    setIsEditing(true);
    setEditedEvent({ ...selectedEvent! });
    setValidationErrors({});
    // Task 10: Clear error messages when user retries
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Task 2.2: Cancel editing without saving
  function handleCancelEdit() {
    setIsEditing(false);
    setEditedEvent(null);
    setValidationErrors({});
    // Task 10: Clear messages when canceling
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Task 2.3: Validate form fields
  function validateEventForm(event: CalendarEvent): Record<string, string> {
    const errors: Record<string, string> = {};
    
    // Validate title (Requirement 3.1)
    if (!event.title?.trim()) {
      errors.title = 'Title is required';
    }
    
    // Validate start date (Requirement 3.2)
    if (!event.start) {
      errors.start = 'Start date is required';
    } else {
      const startDate = new Date(event.start);
      if (isNaN(startDate.getTime())) {
        errors.start = 'Start date is not a valid date';
      }
    }
    
    // Validate end date and time ordering (Requirement 3.2, 3.3)
    if (event.end) {
      const endDate = new Date(event.end);
      if (isNaN(endDate.getTime())) {
        errors.end = 'End date is not a valid date';
      } else if (event.start && new Date(event.start) >= endDate) {
        errors.end = 'End date must be after start date';
      }
    }
    
    return errors;
  }

  // Task 8: Transform frontend event data to backend format
  // Task 9: Update to include clientId if available (Requirement 7.1, 7.2)
  function transformToBackend(event: CalendarEvent) {
    return {
      title: event.title,
      description: event.description || undefined,
      startDate: event.start,
      endDate: event.end || undefined,
      type: event.type ? event.type.toUpperCase() : undefined,
      location: event.location || undefined,
      // Task 9: Include clientId if available, fallback to clientRef (Requirement 7.1)
      clientId: event.clientId || event.clientRef || undefined,
      // Task 9: Include clientName to persist with event (Requirement 7.1)
      clientName: event.clientName || undefined,
      status: event.status ? event.status.toUpperCase() : undefined,
    };
  }

  // Task 8: Transform backend event data to frontend format
  // Task 9: Update to preserve clientName, clientId, and clientRef (Requirement 7.2, 7.3)
  function transformFromBackend(backendEvent: any): CalendarEvent {
    return {
      id: backendEvent.id,
      title: backendEvent.title,
      description: backendEvent.description,
      start: backendEvent.startDate || backendEvent.start,
      end: backendEvent.endDate || backendEvent.end,
      type: backendEvent.type ? (backendEvent.type.toUpperCase() as CalendarType) : null,
      status: backendEvent.status ? (backendEvent.status.toLowerCase() as CalendarStatus) : 'scheduled',
      location: backendEvent.location,
      // Task 9: Preserve all three client fields (Requirement 7.3)
      clientRef: backendEvent.clientRef || backendEvent.clientId,
      clientName: backendEvent.clientName,
      clientId: backendEvent.clientId,
      createdAt: backendEvent.createdAt,
      updatedAt: backendEvent.updatedAt,
    };
  }

  // Task 2.4: Save edited event
  async function handleSaveEdit() {
    if (!editedEvent) return;
    
    // Validate form data before submission
    const errors = validateEventForm(editedEvent);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setSaving(true);
    // Task 10: Clear previous messages when user retries
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Task 8: Transform data for backend API
      const payload = transformToBackend(editedEvent);

      // Call API with correct endpoint
      const updated = await api.put(`/calendar/events/${editedEvent.id}`, payload);
      
      // Task 8: Transform response back to frontend format
      const updatedEvent = transformFromBackend(updated);
      
      // Update local events state with new data
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      
      // Update selectedEvent with new data
      setSelectedEvent(updatedEvent);
      
      // Exit edit mode on success
      setIsEditing(false);
      setEditedEvent(null);
      
      // Task 10: Show success message after successful edit (Requirement 4.3)
      setSuccessMessage('Event updated successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      // Task 10: Show error message when edit fails (Requirement 4.4)
      setErrorMessage(err?.message || 'Failed to update event. Please try again.');
      console.error('Failed to update event:', err);
    } finally {
      setSaving(false);
    }
  }

  // Task 3.1: Show delete confirmation dialog
  function handleDeleteClick() {
    setShowDeleteConfirm(true);
    // Task 10: Clear messages when opening delete dialog
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Task 3.2: Cancel delete and return to view mode
  function handleCancelDelete() {
    setShowDeleteConfirm(false);
  }

  // Task 3.3: Confirm and delete event
  async function handleConfirmDelete() {
    if (!selectedEvent) return;
    
    setDeleting(true);
    // Task 10: Clear previous messages when user retries
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Call API to delete event with correct endpoint
      await api.delete(`/calendar/events/${selectedEvent.id}`);
      
      // Remove event from local events state
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      
      // Task 10: Show success message after successful delete (Requirement 4.3)
      setSuccessMessage('Event cancelled successfully!');
      
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        setSelectedEvent(null);
        setShowDeleteConfirm(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      // Task 10: Show error message when delete fails (Requirement 4.4)
      setErrorMessage(err?.message || 'Failed to cancel event. Please try again.');
      console.error('Failed to cancel event:', err);
    } finally {
      setDeleting(false);
    }
  }

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const [calendarData, tasksData] = await Promise.all([
        api.get<CalendarEvent[]>('/calendar').catch(() => [] as CalendarEvent[]),
        api.get<any[]>('/tasks').catch(() => [] as any[]),
      ]);

      // Task 3: Enhance calendar events with client names (Requirements 1.3, 2.1, 7.3)
      // Task 8: Add error handling for client data loading (Requirements 8.1, 8.5)
      // Process calendar events and fetch client names for events with clientRef but no clientName
      const calendarEvents: CalendarEvent[] = await Promise.all(
        (calendarData || []).map(async (e) => {
          // Handle events that already have clientName (skip fetch)
          if (e.clientName) {
            return {
              ...e,
              type: (e.type as CalendarType) || 'OTHER',
            };
          }
          
          // Handle events with clientRef but no clientName (fetch client data)
          if (e.clientRef && !e.clientName) {
            try {
              const client = await fetchClientByRef(e.clientRef);
              
              // Requirement 8.1: Handle client not found scenario
              if (!client) {
                // Show "Not Found" indicator for missing clients
                console.warn(`Client not found for ref ${e.clientRef}`);
                return {
                  ...e,
                  clientName: `${e.clientRef} (Not Found)`,
                  type: (e.type as CalendarType) || 'OTHER',
                };
              }
              
              return {
                ...e,
                clientName: client.name,
                type: (e.type as CalendarType) || 'OTHER',
              };
            } catch (err) {
              // Requirement 8.5: Graceful degradation - calendar loads even if client fetch fails
              // Requirement 8.4: Error logging for debugging
              console.error(`Failed to fetch client for ref ${e.clientRef}:`, err);
              // Return event with reference only if fetch fails
              return {
                ...e,
                clientName: `${e.clientRef} (Error)`,
                type: (e.type as CalendarType) || 'OTHER',
              };
            }
          }
          
          // Handle events without client data (no fetch needed)
          return {
            ...e,
            type: (e.type as CalendarType) || 'OTHER',
          };
        })
      );

      // Task 3: Update task events mapping to preserve existing clientName (Requirement 7.3)
      // Convert tasks to calendar events (auto-tasks) - tasks already have clientName
      const taskEvents: CalendarEvent[] = (Array.isArray(tasksData) ? tasksData : []).map(
        (task: any) => ({
          id: `task-${task.id}`,
          title: task.title,
          description: task.description || '',
          status: task.status === 'completed' ? 'completed' : 'scheduled',
          start: task.dueDate || new Date().toISOString(),
          end: undefined,
          location: task.clientName || '',
          clientName: task.clientName || '', // Preserve existing clientName from task
          clientRef: task.clientRef || '',
          type: 'TASK',
        }),
      );

      setEvents([...calendarEvents, ...taskEvents]);
    } catch (e: any) {
      console.warn('Failed to load calendar data:', e?.message || e);
      setEvents([]);
      setError('Failed to load calendar data.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesStatus = statusFilter === 'all' ? true : e.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q) ||
        (e.clientRef ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [events, statusFilter, search]);

  function handleEventClick(info: any) {
    const id = info.event.id;
    const ev = events.find((e) => e.id === id);
    if (ev) setSelectedEvent(ev);
  }

  async function handleEventDrop(info: any) {
    const id = info.event.id;
    const newStart = info.event.start?.toISOString();
    if (!newStart) return;

    const original = events.find((e) => e.id === id);
    if (!original) return;

    const updated: CalendarEvent = { ...original, start: newStart };

    // optimistic update
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (selectedEvent?.id === id) setSelectedEvent(updated);

    // Only persist real calendar events (not auto-tasks)
    if (id.startsWith('task-')) return;

    try {
      // Task 8: Transform start to startDate for backend
      await api.put(`/calendar/events/${id}`, { startDate: newStart });
    } catch (err) {
      console.warn('Failed to move event, reverting.', err);
      info.revert();
      setEvents((prev) => prev.map((e) => (e.id === id ? original : e)));
      if (selectedEvent?.id === id) setSelectedEvent(original);
      alert('Failed to move event. Please try again.');
    }
  }

  function mapToFullCalendarEvent(e: CalendarEvent) {
    const colour = typeColour((e.type as CalendarType) || 'OTHER');
    // Task 4: Append client name to event title with separator (Requirements 1.1, 4.1, 4.2, 4.4)
    // Task 8: Handle "Not Found" indicator in display (Requirement 8.1)
    // Task 10: Use CSS classes for consistent styling (Requirements 3.4, 4.5)
    let displayTitle = e.title;
    if (e.clientName) {
      // Check if client was not found or had an error
      if (e.clientName.includes('(Not Found)') || e.clientName.includes('(Error)')) {
        // Display with warning indicator - styled with client-not-found class
        displayTitle = `${e.title} • ⚠ ${e.clientName}`;
      } else {
        // Normal display with separator - styled with client-separator class
        displayTitle = `${e.title} • ${e.clientName}`;
      }
    }
    
    return {
      id: e.id,
      title: displayTitle,
      start: e.start,
      end: e.end,
      backgroundColor: colour,
      borderColor: colour,
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const coerce = (val?: string) => {
        if (!val) return undefined;
        if (val.length === 16 && val.includes('T')) {
          const d = new Date(val);
          return d.toISOString();
        }
        return val;
      };

      const frontendPayload = {
        ...newEvent,
        start: coerce(newEvent.start),
        end: coerce(newEvent.end),
      };

      // Task 8: Transform to backend format
      const backendPayload = transformToBackend(frontendPayload as CalendarEvent);

      let created: CalendarEvent | null = null;
      try {
        const response = await api.post('/calendar', backendPayload);
        // Task 8: Transform response back to frontend format
        created = transformFromBackend(response);
      } catch (err) {
        // fallback: local demo event
        created = { id: `local-${Date.now()}`, ...(frontendPayload as any) };
      }

      if (created) {
        // ensure type defaulted
        const withType: CalendarEvent = {
          ...created,
          type: (created.type as CalendarType) || newEvent.type || 'OTHER',
        };
        setEvents((prev) => [withType, ...prev]);
      }

      setShowCreate(false);
      setNewEvent(defaultNewEvent);
    } catch (err: any) {
      setError(err?.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MDJShell
      pageTitle="Calendar"
      pageSubtitle="Manage appointments, deadlines, and events"
      showBack
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Calendar' },
      ]}
      actions={[
        <div key="actions" className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            className="btn-outline-gold"
            onClick={() => {
              const api = (window as any).calendarApi as any;
              if (api) api.changeView('dayGridMonth');
            }}
          >
            Month
          </button>
          <button
            type="button"
            className="btn-outline-gold"
            onClick={() => {
              const api = (window as any).calendarApi as any;
              if (api) api.changeView('timeGridWeek');
            }}
          >
            Week
          </button>
          <button
            type="button"
            className="btn-outline-gold"
            onClick={() => {
              const api = (window as any).calendarApi as any;
              if (api) api.changeView('timeGridDay');
            }}
          >
            Day
          </button>
          <button
            type="button"
            className="btn-outline-gold"
            onClick={() => {
              const api = (window as any).calendarApi as any;
              if (api) api.today();
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-gold"
            onClick={() => setShowCreate(true)}
          >
            Add Event
          </button>
          <button type="button" className="btn-outline-gold" onClick={loadEvents}>
            Refresh
          </button>
        </div>,
      ]}
    >
      {/* Filters */}
      <div className="card-mdj mb-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Filter Status</label>
            <select
              className="input-mdj"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Search</label>
            <input
              className="input-mdj"
              placeholder="Search title, client, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main layout: calendar + details */}
      {loading ? (
        <div className="center-stack py-8">
          <div className="spinner mb-3" />
          <p>Loading events…</p>
        </div>
      ) : error ? (
        <div className="card-mdj">
          <p className="text-danger mb-2">{error}</p>
          <button className="btn-outline-gold" onClick={loadEvents}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="card-mdj p-2">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              editable
              selectable
              headerToolbar={{
                left: '',
                center: 'title',
                right: 'prev,next',
              }}
              events={filtered.map(mapToFullCalendarEvent)}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
              datesSet={(arg) => {
                // expose API globally so the Month/Week/Day actions can use it
                (window as any).calendarApi = arg.view.calendar;
              }}
            />
          </div>

          {/* Colour legend */}
          <div className="card-mdj mt-4">
            <h4 className="font-semibold mb-2">Event Colours</h4>
            <ul className="text-sm space-y-1">
              {(
                [
                  'MEETING',
                  'DEADLINE',
                  'REMINDER',
                  'APPOINTMENT',
                  'FILING',
                  'TASK',
                  'OTHER',
                ] as CalendarType[]
              ).map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: typeColour(t) }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>
                    {t.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Event Details MODAL */}
      {selectedEvent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal card-mdj" style={{ maxWidth: 650, padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {isEditing ? 'Edit Event' : 'Event Details'}
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setSelectedEvent(null);
                  setIsEditing(false);
                  setEditedEvent(null);
                  setValidationErrors({});
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={{ fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>

            {/* Task 10: Success and error feedback display (Requirements 4.3, 4.4) */}
            {successMessage && (
              <div 
                style={{ 
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  color: '#065f46',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>✓</span>
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div 
                style={{ 
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>⚠</span>
                {errorMessage}
              </div>
            )}

            {/* Task 5: Edit Mode Form UI */}
            {isEditing && editedEvent ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Task 5.1: Title field with validation error display (Task 5.2) */}
                <div>
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    className="input-mdj"
                    value={editedEvent.title}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, title: e.target.value }))}
                    required
                  />
                  {validationErrors.title && (
                    <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {validationErrors.title}
                    </span>
                  )}
                </div>

                {/* Task 5.1: Description textarea */}
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input-mdj"
                    rows={3}
                    value={editedEvent.description || ''}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, description: e.target.value }))}
                  />
                </div>

                {/* Task 5.1: Start date/time field with validation error display (Task 5.2) */}
                <div>
                  <label className="label">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="input-mdj"
                    value={editedEvent.start ? new Date(editedEvent.start).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, start: e.target.value }))}
                    required
                  />
                  {validationErrors.start && (
                    <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {validationErrors.start}
                    </span>
                  )}
                </div>

                {/* Task 5.1: End date/time field with validation error display (Task 5.2) */}
                <div>
                  <label className="label">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="input-mdj"
                    value={editedEvent.end ? new Date(editedEvent.end).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, end: e.target.value }))}
                  />
                  {validationErrors.end && (
                    <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {validationErrors.end}
                    </span>
                  )}
                </div>

                {/* Task 5.1: Type dropdown */}
                <div>
                  <label className="label">Type</label>
                  <select
                    className="input-mdj"
                    value={editedEvent.type || 'OTHER'}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, type: e.target.value as CalendarType }))}
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="APPOINTMENT">Appointment</option>
                    <option value="FILING">Filing</option>
                    <option value="TASK">Task</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Task 5.1: Status dropdown */}
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input-mdj"
                    value={editedEvent.status || 'scheduled'}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, status: e.target.value as CalendarStatus }))}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Task 5.1: Location field */}
                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    className="input-mdj"
                    value={editedEvent.location || ''}
                    onChange={(e) => setEditedEvent(prev => ({ ...prev!, location: e.target.value }))}
                  />
                </div>

                {/* Task 6: Replace client reference input with ClientSelect (Requirements 1.4, 6.1, 6.2, 6.3, 6.4, 6.5) */}
                <div>
                  <label className="label">Client</label>
                  <ClientSelect
                    value={editedEvent.clientRef || ''}
                    onChange={(clientRef, clientName, clientId) => {
                      setEditedEvent(prev => ({
                        ...prev!,
                        clientRef,
                        clientName,
                        clientId,
                      }));
                    }}
                    placeholder="Search for a client..."
                    disabled={saving}
                  />
                  {/* Task 6: Show selected client information below dropdown (Requirement 6.3) */}
                  {/* Task 10: Use CSS classes for consistent styling (Requirements 3.4, 4.5) */}
                  {editedEvent.clientName && (
                    <div className="client-selected-info">
                      Selected: <span className="client-selected-name">{editedEvent.clientName}</span>
                      {editedEvent.clientRef && (
                        <span className="client-selected-ref">
                          ({editedEvent.clientRef})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Task 5.3: Form action buttons */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '0.75rem', 
                    paddingTop: '1.5rem', 
                    marginTop: '0.5rem',
                    borderTop: '2px solid var(--border-color)' 
                  }}
                >
                  <button
                    type="button"
                    className="btn-outline-gold"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Event Type & Status */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-soft)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <span
                    className="inline-block"
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%',
                      backgroundColor: typeColour((selectedEvent.type as CalendarType) ?? 'OTHER')
                    }}
                  />
                  <span className={statusBadgeClass(selectedEvent.status)} style={{ textTransform: 'capitalize' }}>
                    {selectedEvent.status}
                  </span>
                  {selectedEvent.type && (
                    <span className="chip">
                      <span style={{ textTransform: 'capitalize' }}>
                        {selectedEvent.type.toLowerCase()}
                      </span>
                    </span>
                  )}
                </div>

                {/* Event Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div 
                    style={{ 
                      padding: '1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      backgroundColor: 'white'
                    }}
                  >
                    <label className="label" style={{ marginBottom: '0.5rem' }}>Title</label>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-dark)' }}>
                      {selectedEvent.title}
                    </div>
                  </div>

                  {selectedEvent.description && (
                    <div 
                      style={{ 
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'white'
                      }}
                    >
                      <label className="label" style={{ marginBottom: '0.5rem' }}>Description</label>
                      <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: selectedEvent.end ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                    <div 
                      style={{ 
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'white'
                      }}
                    >
                      <label className="label" style={{ marginBottom: '0.5rem' }}>Start</label>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                        {new Date(selectedEvent.start).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {selectedEvent.end && (
                      <div 
                        style={{ 
                          padding: '1rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          backgroundColor: 'white'
                        }}
                      >
                        <label className="label" style={{ marginBottom: '0.5rem' }}>End</label>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                          {new Date(selectedEvent.end).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedEvent.location && (
                    <div 
                      style={{ 
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'white'
                      }}
                    >
                      <label className="label" style={{ marginBottom: '0.5rem' }}>Location</label>
                      <div style={{ fontSize: '0.95rem' }}>{selectedEvent.location}</div>
                    </div>
                  )}

                  {/* Task 5: Enhanced client information display (Requirements 1.2, 3.1, 3.2, 3.3, 3.5) */}
                  {/* Task 8: Handle client not found display (Requirement 8.1) */}
                  {/* Task 10: Use CSS classes for consistent styling (Requirements 3.4, 4.5) */}
                  {(selectedEvent.clientRef || selectedEvent.clientName) && (
                    <div className="client-info-section">
                      <label className="client-info-label">Client</label>
                      <div className="client-info-content">
                        {/* Display client name prominently as primary identifier (Requirement 3.1) */}
                        {selectedEvent.clientName ? (
                          <>
                            {/* Requirement 8.1: Check if client was not found or had an error */}
                            {selectedEvent.clientName.includes('(Not Found)') || selectedEvent.clientName.includes('(Error)') ? (
                              <div className="client-not-found">
                                <span className="client-not-found-icon">⚠</span>
                                <span>{selectedEvent.clientName}</span>
                                {selectedEvent.clientName.includes('(Not Found)') && (
                                  <span className="client-not-found-helper">
                                    Client may have been deleted
                                  </span>
                                )}
                              </div>
                            ) : (
                              <>
                                {/* Make client name a clickable link to client detail page (Requirement 3.5) */}
                                <Link 
                                  href={`/clients/${selectedEvent.clientRef || selectedEvent.id}`}
                                  className="client-name-link client-info-primary"
                                >
                                  {selectedEvent.clientName}
                                </Link>
                                {/* Show client reference in parentheses after name (Requirement 3.2) */}
                                {selectedEvent.clientRef && (
                                  <span className="client-ref-display">
                                    ({selectedEvent.clientRef})
                                  </span>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          /* Handle events with only clientRef - show reference with label (Requirement 3.3) */
                          <div className="client-ref-only">
                            <span className="client-ref-label">
                              Reference:
                            </span>
                            <span className="client-ref-value">
                              {selectedEvent.clientRef}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Handle events without any client data - section is hidden (Requirement 3.5) */}
                </div>

                {/* Actions */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '0.75rem', 
                    paddingTop: '1.5rem', 
                    marginTop: '0.5rem',
                    borderTop: '2px solid var(--border-color)' 
                  }}
                >
                  <button
                    type="button"
                    className="btn-outline-gold"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Close
                  </button>
                  {!selectedEvent.id.startsWith('task-') && (
                    <>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={handleDeleteClick}
                      >
                        Cancel Event
                      </button>
                      <button
                        type="button"
                        className="btn-gold"
                        onClick={handleEditClick}
                      >
                        Edit Event
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task 6: Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1001 }}>
          <div className="modal card-mdj" style={{ maxWidth: 450, padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc2626' }}>
                Cancel Event?
              </h3>
            </div>

            {/* Task 10: Success and error feedback in delete dialog (Requirements 4.3, 4.4) */}
            {successMessage && (
              <div 
                style={{ 
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  color: '#065f46',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>✓</span>
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div 
                style={{ 
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>⚠</span>
                {errorMessage}
              </div>
            )}

            <p style={{ fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem', color: 'var(--text-dark)' }}>
              Are you sure you want to cancel this event? This action cannot be undone.
            </p>

            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '0.75rem', 
                paddingTop: '1rem',
                borderTop: '2px solid var(--border-color)' 
              }}
            >
              <button
                type="button"
                className="btn-outline-gold"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                No, Keep Event
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ 
                  backgroundColor: deleting ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none'
                }}
              >
                {deleting ? 'Cancelling...' : 'Yes, Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event MODAL (popup, not inline) */}
      {showCreate && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal card-mdj" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Create Event</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="grid gap-3">
              <div>
                <label className="label">Title *</label>
                <input
                  className="input-mdj"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent((p) => ({ ...p, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Start *</label>
                  <input
                    type="datetime-local"
                    className="input-mdj"
                    value={newEvent.start?.slice(0, 16) || ''}
                    onChange={(e) =>
                      setNewEvent((p) => ({ ...p, start: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">End</label>
                  <input
                    type="datetime-local"
                    className="input-mdj"
                    value={newEvent.end?.slice(0, 16) || ''}
                    onChange={(e) =>
                      setNewEvent((p) => ({ ...p, end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select
                    className="input-mdj"
                    value={newEvent.type || 'OTHER'}
                    onChange={(e) =>
                      setNewEvent((p) => ({
                        ...p,
                        type: e.target.value as CalendarType,
                      }))
                    }
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="APPOINTMENT">Appointment</option>
                    <option value="FILING">Filing</option>
                    <option value="TASK">Task / Auto-task</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    className="input-mdj"
                    value={newEvent.status}
                    onChange={(e) =>
                      setNewEvent((p) => ({
                        ...p,
                        status: e.target.value as CalendarStatus,
                      }))
                    }
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Task 7: Replace client reference input with ClientSelect (Requirements 1.3, 6.1, 6.2, 6.3, 6.4, 6.5) */}
              <div>
                <label className="label">Client</label>
                <ClientSelect
                  value={newEvent.clientRef || ''}
                  onChange={(clientRef, clientName, clientId) => {
                    setNewEvent((p) => ({
                      ...p,
                      clientRef,
                      clientName,
                      clientId,
                    }));
                  }}
                  placeholder="Search for a client..."
                  disabled={saving}
                />
                {/* Task 7: Show selected client information (Requirement 6.3) */}
                {/* Task 10: Use CSS classes for consistent styling (Requirements 3.4, 4.5) */}
                {newEvent.clientName && (
                  <div className="client-selected-info">
                    Selected: <span className="client-selected-name">{newEvent.clientName}</span>
                    {newEvent.clientRef && (
                      <span className="client-selected-ref">
                        ({newEvent.clientRef})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Location</label>
                <input
                  className="input-mdj"
                  placeholder="Where is this happening?"
                  value={newEvent.location || ''}
                  onChange={(e) =>
                    setNewEvent((p) => ({
                      ...p,
                      location: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input-mdj"
                  rows={3}
                  value={newEvent.description || ''}
                  onChange={(e) =>
                    setNewEvent((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="btn-outline-gold"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-gold" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MDJShell>
  );
}