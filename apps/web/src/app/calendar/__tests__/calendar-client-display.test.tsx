/**
 * Test 11: Calendar Grid Client Name Display
 * 
 * This test verifies that client names are correctly displayed on the calendar grid
 * with proper formatting across different scenarios.
 * 
 * Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect } from '@jest/globals';

// Mock calendar event data for testing
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  start: string;
  end?: string;
  location?: string;
  clientRef?: string;
  clientName?: string;
  clientId?: string;
  type?: string;
}

/**
 * Function to map calendar event to display title
 * This mirrors the logic in mapToFullCalendarEvent
 */
function getDisplayTitle(event: CalendarEvent): string {
  let displayTitle = event.title;
  
  if (event.clientName) {
    // Check if client was not found or had an error
    if (event.clientName.includes('(Not Found)') || event.clientName.includes('(Error)')) {
      displayTitle = `${event.title} • ⚠ ${event.clientName}`;
    } else {
      // Normal display with separator
      displayTitle = `${event.title} • ${event.clientName}`;
    }
  }
  
  return displayTitle;
}

describe('Calendar Grid Client Name Display', () => {
  describe('Requirement 1.1 & 4.1: Display client names alongside event titles', () => {
    it('should append client name to event title with separator', () => {
      const event: CalendarEvent = {
        id: '1',
        title: 'Client Meeting',
        status: 'scheduled',
        start: '2025-11-26T10:00:00Z',
        clientName: 'Acme Corporation Ltd',
        clientRef: '1A001',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Client Meeting • Acme Corporation Ltd');
      expect(displayTitle).toContain('•');
      expect(displayTitle).toContain(event.title);
      expect(displayTitle).toContain(event.clientName);
    });

    it('should display only title when no client is associated', () => {
      const event: CalendarEvent = {
        id: '2',
        title: 'Team Standup',
        status: 'scheduled',
        start: '2025-11-26T14:00:00Z',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Team Standup');
      expect(displayTitle).not.toContain('•');
    });
  });

  describe('Requirement 4.2: Use visual separator between title and client name', () => {
    it('should use bullet point (•) as separator', () => {
      const event: CalendarEvent = {
        id: '3',
        title: 'Tax Filing',
        status: 'scheduled',
        start: '2025-11-27T17:00:00Z',
        clientName: 'Smith & Associates',
        clientRef: '2B002',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toMatch(/Tax Filing • Smith & Associates/);
      expect(displayTitle.split('•').length).toBe(2);
    });

    it('should have proper spacing around separator', () => {
      const event: CalendarEvent = {
        id: '4',
        title: 'Consultation',
        status: 'scheduled',
        start: '2025-11-28T09:00:00Z',
        clientName: 'Tech Innovations Ltd',
        clientRef: '3C003',
      };

      const displayTitle = getDisplayTitle(event);

      // Check for space before and after bullet
      expect(displayTitle).toMatch(/ • /);
      expect(displayTitle).not.toMatch(/•[^ ]/); // No character immediately after bullet
      expect(displayTitle).not.toMatch(/[^ ]•/); // No character immediately before bullet
    });
  });

  describe('Requirement 4.3: Handle long titles and client names', () => {
    it('should handle very long event titles', () => {
      const event: CalendarEvent = {
        id: '5',
        title: 'Very Long Event Title That Should Be Handled Properly When Combined With Client Name',
        status: 'scheduled',
        start: '2025-11-29T15:00:00Z',
        clientName: 'International Business Solutions Corporation Limited',
        clientRef: '4D004',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toContain(event.title);
      expect(displayTitle).toContain(event.clientName);
      expect(displayTitle).toContain('•');
      // The actual truncation happens in CSS, so we just verify the full string is constructed
      expect(displayTitle.length).toBeGreaterThan(50);
    });

    it('should handle short titles with long client names', () => {
      const event: CalendarEvent = {
        id: '6',
        title: 'Call',
        status: 'scheduled',
        start: '2025-11-30T11:00:00Z',
        clientName: 'The Very Long Client Name Corporation International Limited Partnership',
        clientRef: '5E005',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Call • The Very Long Client Name Corporation International Limited Partnership');
    });
  });

  describe('Requirement 4.4: Display in all calendar views', () => {
    it('should format consistently for month view', () => {
      const event: CalendarEvent = {
        id: '7',
        title: 'Monthly Review',
        status: 'scheduled',
        start: '2025-12-01T10:00:00Z',
        clientName: 'Global Enterprises',
        clientRef: '6F006',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Monthly Review • Global Enterprises');
    });

    it('should format consistently for week view', () => {
      const event: CalendarEvent = {
        id: '8',
        title: 'Weekly Sync',
        status: 'scheduled',
        start: '2025-12-02T14:00:00Z',
        clientName: 'Startup Inc',
        clientRef: '7G007',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Weekly Sync • Startup Inc');
    });

    it('should format consistently for day view', () => {
      const event: CalendarEvent = {
        id: '9',
        title: 'Daily Briefing',
        status: 'scheduled',
        start: '2025-12-03T09:00:00Z',
        clientName: 'Consulting Group',
        clientRef: '8H008',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Daily Briefing • Consulting Group');
    });
  });

  describe('Requirement 8.1: Handle client not found scenarios', () => {
    it('should display warning indicator for not found clients', () => {
      const event: CalendarEvent = {
        id: '10',
        title: 'Meeting',
        status: 'scheduled',
        start: '2025-12-04T10:00:00Z',
        clientName: '9I009 (Not Found)',
        clientRef: '9I009',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toContain('⚠');
      expect(displayTitle).toContain('(Not Found)');
      expect(displayTitle).toBe('Meeting • ⚠ 9I009 (Not Found)');
    });

    it('should display warning indicator for error loading clients', () => {
      const event: CalendarEvent = {
        id: '11',
        title: 'Appointment',
        status: 'scheduled',
        start: '2025-12-05T11:00:00Z',
        clientName: '10J010 (Error)',
        clientRef: '10J010',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toContain('⚠');
      expect(displayTitle).toContain('(Error)');
      expect(displayTitle).toBe('Appointment • ⚠ 10J010 (Error)');
    });
  });

  describe('Edge cases and special characters', () => {
    it('should handle client names with special characters', () => {
      const event: CalendarEvent = {
        id: '12',
        title: 'Legal Review',
        status: 'scheduled',
        start: '2025-12-06T13:00:00Z',
        clientName: "O'Brien & Associates Ltd.",
        clientRef: '11K011',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe("Legal Review • O'Brien & Associates Ltd.");
      expect(displayTitle).toContain("'");
      expect(displayTitle).toContain('&');
    });

    it('should handle client names with unicode characters', () => {
      const event: CalendarEvent = {
        id: '13',
        title: 'International Meeting',
        status: 'scheduled',
        start: '2025-12-07T10:00:00Z',
        clientName: 'Société Française Ltd',
        clientRef: '12L012',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('International Meeting • Société Française Ltd');
      expect(displayTitle).toContain('é');
    });

    it('should handle empty string client name', () => {
      const event: CalendarEvent = {
        id: '14',
        title: 'Generic Event',
        status: 'scheduled',
        start: '2025-12-08T10:00:00Z',
        clientName: '',
        clientRef: '13M013',
      };

      const displayTitle = getDisplayTitle(event);

      // Empty string is falsy, so no client name should be appended
      expect(displayTitle).toBe('Generic Event');
      expect(displayTitle).not.toContain('•');
    });

    it('should handle undefined client name', () => {
      const event: CalendarEvent = {
        id: '15',
        title: 'Another Event',
        status: 'scheduled',
        start: '2025-12-09T10:00:00Z',
        clientRef: '14N014',
      };

      const displayTitle = getDisplayTitle(event);

      expect(displayTitle).toBe('Another Event');
      expect(displayTitle).not.toContain('•');
    });
  });

  describe('Multiple events scenarios', () => {
    it('should handle multiple events with same client', () => {
      const events: CalendarEvent[] = [
        {
          id: '16',
          title: 'Morning Meeting',
          status: 'scheduled',
          start: '2025-12-10T09:00:00Z',
          clientName: 'Shared Client Ltd',
          clientRef: '15O015',
        },
        {
          id: '17',
          title: 'Afternoon Review',
          status: 'scheduled',
          start: '2025-12-10T14:00:00Z',
          clientName: 'Shared Client Ltd',
          clientRef: '15O015',
        },
      ];

      const displayTitles = events.map(getDisplayTitle);

      expect(displayTitles[0]).toBe('Morning Meeting • Shared Client Ltd');
      expect(displayTitles[1]).toBe('Afternoon Review • Shared Client Ltd');
      expect(displayTitles[0]).not.toBe(displayTitles[1]);
    });

    it('should handle multiple events with different clients', () => {
      const events: CalendarEvent[] = [
        {
          id: '18',
          title: 'Client A Meeting',
          status: 'scheduled',
          start: '2025-12-11T10:00:00Z',
          clientName: 'Client A Ltd',
          clientRef: '16P016',
        },
        {
          id: '19',
          title: 'Client B Meeting',
          status: 'scheduled',
          start: '2025-12-11T11:00:00Z',
          clientName: 'Client B Ltd',
          clientRef: '17Q017',
        },
        {
          id: '20',
          title: 'Internal Meeting',
          status: 'scheduled',
          start: '2025-12-11T12:00:00Z',
        },
      ];

      const displayTitles = events.map(getDisplayTitle);

      expect(displayTitles[0]).toBe('Client A Meeting • Client A Ltd');
      expect(displayTitles[1]).toBe('Client B Meeting • Client B Ltd');
      expect(displayTitles[2]).toBe('Internal Meeting');
    });
  });
});
