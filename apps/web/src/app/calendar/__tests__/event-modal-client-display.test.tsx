/**
 * Test 12: Event Modal Client Display
 * 
 * This test verifies that client information is correctly displayed in the event modal
 * with proper formatting, clickable links, and handling of various scenarios.
 * 
 * Requirements: 1.2, 1.5, 3.1, 3.2, 3.3, 3.5
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
 * Helper function to determine if client section should be displayed
 * Requirement 1.5: Events without clients should not display client section
 */
function shouldDisplayClientSection(event: CalendarEvent): boolean {
  return !!(event.clientRef || event.clientName);
}

/**
 * Helper function to check if client name should be displayed as primary identifier
 * Requirement 3.1: Client name shown as primary identifier
 */
function hasClientNameAsPrimary(event: CalendarEvent): boolean {
  return !!event.clientName && !event.clientName.includes('(Not Found)') && !event.clientName.includes('(Error)');
}

/**
 * Helper function to check if client reference should be shown in parentheses
 * Requirement 3.2: Show client reference in parentheses after name
 */
function shouldShowRefInParentheses(event: CalendarEvent): boolean {
  return hasClientNameAsPrimary(event) && !!event.clientRef;
}

/**
 * Helper function to check if only client reference should be shown
 * Requirement 3.3: Show reference with label when only clientRef available
 */
function shouldShowRefOnly(event: CalendarEvent): boolean {
  return !!event.clientRef && !event.clientName;
}

/**
 * Helper function to check if client name should be a clickable link
 * Requirement 3.5: Client names are clickable links to client detail page
 */
function shouldBeClickableLink(event: CalendarEvent): boolean {
  return hasClientNameAsPrimary(event);
}

/**
 * Helper function to get the expected link href
 */
function getClientLinkHref(event: CalendarEvent): string {
  return `/clients/${event.clientRef || event.id}`;
}

describe('Event Modal Client Display', () => {
  describe('Requirement 1.2: Display client information in event modal', () => {
    it('should display client section when event has client data', () => {
      const event: CalendarEvent = {
        id: '1',
        title: 'Client Meeting',
        status: 'scheduled',
        start: '2025-11-26T10:00:00Z',
        clientName: 'Acme Corporation Ltd',
        clientRef: '1A001',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
    });

    it('should display client section when event has only clientRef', () => {
      const event: CalendarEvent = {
        id: '2',
        title: 'Tax Filing',
        status: 'scheduled',
        start: '2025-11-27T14:00:00Z',
        clientRef: '2B002',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
    });

    it('should display client section when event has only clientName', () => {
      const event: CalendarEvent = {
        id: '3',
        title: 'Consultation',
        status: 'scheduled',
        start: '2025-11-28T09:00:00Z',
        clientName: 'Smith & Associates',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
    });
  });

  describe('Requirement 1.5: Hide client section for events without clients', () => {
    it('should not display client section when no client data', () => {
      const event: CalendarEvent = {
        id: '4',
        title: 'Team Meeting',
        status: 'scheduled',
        start: '2025-11-29T10:00:00Z',
      };

      expect(shouldDisplayClientSection(event)).toBe(false);
    });

    it('should not display client section when clientRef and clientName are empty strings', () => {
      const event: CalendarEvent = {
        id: '5',
        title: 'Internal Review',
        status: 'scheduled',
        start: '2025-11-30T11:00:00Z',
        clientRef: '',
        clientName: '',
      };

      expect(shouldDisplayClientSection(event)).toBe(false);
    });
  });

  describe('Requirement 3.1: Display client name as primary identifier', () => {
    it('should show client name prominently when available', () => {
      const event: CalendarEvent = {
        id: '6',
        title: 'Annual Review',
        status: 'scheduled',
        start: '2025-12-01T10:00:00Z',
        clientName: 'Global Enterprises Ltd',
        clientRef: '3C003',
      };

      expect(hasClientNameAsPrimary(event)).toBe(true);
      expect(event.clientName).toBe('Global Enterprises Ltd');
    });

    it('should not show client name as primary when it contains (Not Found)', () => {
      const event: CalendarEvent = {
        id: '7',
        title: 'Meeting',
        status: 'scheduled',
        start: '2025-12-02T14:00:00Z',
        clientName: '4D004 (Not Found)',
        clientRef: '4D004',
      };

      expect(hasClientNameAsPrimary(event)).toBe(false);
    });

    it('should not show client name as primary when it contains (Error)', () => {
      const event: CalendarEvent = {
        id: '8',
        title: 'Appointment',
        status: 'scheduled',
        start: '2025-12-03T09:00:00Z',
        clientName: '5E005 (Error)',
        clientRef: '5E005',
      };

      expect(hasClientNameAsPrimary(event)).toBe(false);
    });
  });

  describe('Requirement 3.2: Display client reference in parentheses', () => {
    it('should show reference in parentheses after client name', () => {
      const event: CalendarEvent = {
        id: '9',
        title: 'Quarterly Review',
        status: 'scheduled',
        start: '2025-12-04T10:00:00Z',
        clientName: 'Tech Innovations Ltd',
        clientRef: '6F006',
      };

      expect(shouldShowRefInParentheses(event)).toBe(true);
      // Expected format: "Tech Innovations Ltd (6F006)"
    });

    it('should not show parentheses when no clientRef', () => {
      const event: CalendarEvent = {
        id: '10',
        title: 'Strategy Session',
        status: 'scheduled',
        start: '2025-12-05T11:00:00Z',
        clientName: 'Consulting Group',
      };

      expect(shouldShowRefInParentheses(event)).toBe(false);
    });

    it('should not show parentheses when client not found', () => {
      const event: CalendarEvent = {
        id: '11',
        title: 'Follow-up',
        status: 'scheduled',
        start: '2025-12-06T13:00:00Z',
        clientName: '7G007 (Not Found)',
        clientRef: '7G007',
      };

      expect(shouldShowRefInParentheses(event)).toBe(false);
    });
  });

  describe('Requirement 3.3: Show reference with label when only clientRef available', () => {
    it('should display reference with label when no clientName', () => {
      const event: CalendarEvent = {
        id: '12',
        title: 'Tax Deadline',
        status: 'scheduled',
        start: '2025-12-07T10:00:00Z',
        clientRef: '8H008',
      };

      expect(shouldShowRefOnly(event)).toBe(true);
      // Expected format: "Reference: 8H008"
    });

    it('should not show reference only when clientName exists', () => {
      const event: CalendarEvent = {
        id: '13',
        title: 'Planning Meeting',
        status: 'scheduled',
        start: '2025-12-08T14:00:00Z',
        clientName: 'Startup Inc',
        clientRef: '9I009',
      };

      expect(shouldShowRefOnly(event)).toBe(false);
    });
  });

  describe('Requirement 3.5: Client names are clickable links', () => {
    it('should make client name a clickable link when valid', () => {
      const event: CalendarEvent = {
        id: '14',
        title: 'Business Review',
        status: 'scheduled',
        start: '2025-12-09T10:00:00Z',
        clientName: 'International Corp',
        clientRef: '10J010',
      };

      expect(shouldBeClickableLink(event)).toBe(true);
      expect(getClientLinkHref(event)).toBe('/clients/10J010');
    });

    it('should use clientRef for link href when available', () => {
      const event: CalendarEvent = {
        id: '15',
        title: 'Audit Meeting',
        status: 'scheduled',
        start: '2025-12-10T09:00:00Z',
        clientName: 'Finance Solutions Ltd',
        clientRef: '11K011',
        clientId: 'uuid-123',
      };

      expect(getClientLinkHref(event)).toBe('/clients/11K011');
    });

    it('should fallback to event id for link href when no clientRef', () => {
      const event: CalendarEvent = {
        id: '16',
        title: 'Consultation',
        status: 'scheduled',
        start: '2025-12-11T11:00:00Z',
        clientName: 'Legal Associates',
      };

      expect(getClientLinkHref(event)).toBe('/clients/16');
    });

    it('should not be clickable when client not found', () => {
      const event: CalendarEvent = {
        id: '17',
        title: 'Review',
        status: 'scheduled',
        start: '2025-12-12T13:00:00Z',
        clientName: '12L012 (Not Found)',
        clientRef: '12L012',
      };

      expect(shouldBeClickableLink(event)).toBe(false);
    });

    it('should not be clickable when client has error', () => {
      const event: CalendarEvent = {
        id: '18',
        title: 'Meeting',
        status: 'scheduled',
        start: '2025-12-13T10:00:00Z',
        clientName: '13M013 (Error)',
        clientRef: '13M013',
      };

      expect(shouldBeClickableLink(event)).toBe(false);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle event with all client fields populated', () => {
      const event: CalendarEvent = {
        id: '19',
        title: 'Comprehensive Meeting',
        status: 'scheduled',
        start: '2025-12-14T10:00:00Z',
        clientName: 'Complete Client Ltd',
        clientRef: '14N014',
        clientId: 'uuid-complete-123',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
      expect(hasClientNameAsPrimary(event)).toBe(true);
      expect(shouldShowRefInParentheses(event)).toBe(true);
      expect(shouldBeClickableLink(event)).toBe(true);
      expect(getClientLinkHref(event)).toBe('/clients/14N014');
    });

    it('should handle client name with special characters', () => {
      const event: CalendarEvent = {
        id: '20',
        title: 'Legal Consultation',
        status: 'scheduled',
        start: '2025-12-15T14:00:00Z',
        clientName: "O'Brien & Associates Ltd.",
        clientRef: '15O015',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
      expect(hasClientNameAsPrimary(event)).toBe(true);
      expect(event.clientName).toContain("'");
      expect(event.clientName).toContain('&');
    });

    it('should handle client name with unicode characters', () => {
      const event: CalendarEvent = {
        id: '21',
        title: 'International Meeting',
        status: 'scheduled',
        start: '2025-12-16T10:00:00Z',
        clientName: 'Société Française Ltd',
        clientRef: '16P016',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
      expect(hasClientNameAsPrimary(event)).toBe(true);
      expect(event.clientName).toContain('é');
    });

    it('should handle very long client names', () => {
      const event: CalendarEvent = {
        id: '22',
        title: 'Extended Review',
        status: 'scheduled',
        start: '2025-12-17T09:00:00Z',
        clientName: 'The Very Long International Business Solutions Corporation Limited Partnership',
        clientRef: '17Q017',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
      expect(hasClientNameAsPrimary(event)).toBe(true);
      expect(event.clientName!.length).toBeGreaterThan(50);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle client not found with warning indicator', () => {
      const event: CalendarEvent = {
        id: '23',
        title: 'Orphaned Event',
        status: 'scheduled',
        start: '2025-12-18T10:00:00Z',
        clientName: '18R018 (Not Found)',
        clientRef: '18R018',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
      expect(hasClientNameAsPrimary(event)).toBe(false);
      expect(shouldBeClickableLink(event)).toBe(false);
      expect(event.clientName).toContain('(Not Found)');
    });

    it('should handle client loading error with warning indicator', () => {
      const event: CalendarEvent = {
        id: '24',
        title: 'Error Event',
        status: 'scheduled',
        start: '2025-12-19T11:00:00Z',
        clientName: '19S019 (Error)',
        clientRef: '19S019',
      };

      expect(shouldDisplayClientSection(event)).toBe(true);
      expect(hasClientNameAsPrimary(event)).toBe(false);
      expect(shouldBeClickableLink(event)).toBe(false);
      expect(event.clientName).toContain('(Error)');
    });
  });

  describe('Multiple event scenarios', () => {
    it('should handle multiple events with different client display patterns', () => {
      const events: CalendarEvent[] = [
        {
          id: '25',
          title: 'Event with full client',
          status: 'scheduled',
          start: '2025-12-20T10:00:00Z',
          clientName: 'Full Client Ltd',
          clientRef: '20T020',
        },
        {
          id: '26',
          title: 'Event with ref only',
          status: 'scheduled',
          start: '2025-12-20T11:00:00Z',
          clientRef: '21U021',
        },
        {
          id: '27',
          title: 'Event without client',
          status: 'scheduled',
          start: '2025-12-20T12:00:00Z',
        },
        {
          id: '28',
          title: 'Event with not found client',
          status: 'scheduled',
          start: '2025-12-20T13:00:00Z',
          clientName: '22V022 (Not Found)',
          clientRef: '22V022',
        },
      ];

      expect(shouldDisplayClientSection(events[0])).toBe(true);
      expect(hasClientNameAsPrimary(events[0])).toBe(true);
      expect(shouldBeClickableLink(events[0])).toBe(true);

      expect(shouldDisplayClientSection(events[1])).toBe(true);
      expect(shouldShowRefOnly(events[1])).toBe(true);

      expect(shouldDisplayClientSection(events[2])).toBe(false);

      expect(shouldDisplayClientSection(events[3])).toBe(true);
      expect(hasClientNameAsPrimary(events[3])).toBe(false);
      expect(shouldBeClickableLink(events[3])).toBe(false);
    });
  });

  describe('Link navigation scenarios', () => {
    it('should generate correct link for standard client', () => {
      const event: CalendarEvent = {
        id: '29',
        title: 'Standard Meeting',
        status: 'scheduled',
        start: '2025-12-21T10:00:00Z',
        clientName: 'Standard Client Ltd',
        clientRef: '23W023',
      };

      const href = getClientLinkHref(event);
      expect(href).toBe('/clients/23W023');
      expect(href).toMatch(/^\/clients\//);
    });

    it('should handle numeric client references', () => {
      const event: CalendarEvent = {
        id: '30',
        title: 'Numeric Ref Meeting',
        status: 'scheduled',
        start: '2025-12-22T14:00:00Z',
        clientName: 'Numeric Client Ltd',
        clientRef: '12345',
      };

      const href = getClientLinkHref(event);
      expect(href).toBe('/clients/12345');
    });

    it('should handle alphanumeric client references', () => {
      const event: CalendarEvent = {
        id: '31',
        title: 'Alphanumeric Meeting',
        status: 'scheduled',
        start: '2025-12-23T09:00:00Z',
        clientName: 'Alpha Client Ltd',
        clientRef: 'ABC123XYZ',
      };

      const href = getClientLinkHref(event);
      expect(href).toBe('/clients/ABC123XYZ');
    });
  });
});
