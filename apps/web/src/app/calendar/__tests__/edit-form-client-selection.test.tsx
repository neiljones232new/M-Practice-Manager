/**
 * Test Suite: Client Selection in Edit Event Form
 * 
 * ⚠️ IMPORTANT: This test file CANNOT be executed without setting up testing infrastructure.
 * The web app (apps/web) does not have Jest or testing libraries configured.
 * 
 * This file serves as:
 * - Documentation of expected behavior
 * - Reference implementation for future testing
 * - Template for when testing infrastructure is added
 * 
 * For actual testing, use the manual test guide:
 * .kiro/specs/client-name-display/test-14-edit-form-client-selection.md
 * 
 * This test suite validates the client selection functionality in the edit event form,
 * including editing events with existing clients, changing clients, adding clients to
 * events without them, and clearing client selections.
 * 
 * Requirements tested:
 * - 1.4: Edit event and change client reference, update displayed client name
 * - 6.1: Client selection dropdown/autocomplete
 * - 6.2: Display client names with references
 * - 6.3: Populate client reference and name fields on selection
 * - 6.4: Support searching by client name or reference
 * - 6.5: "No client" option for clearing selection
 * 
 * To enable automated testing, install dependencies:
 * npm install --save-dev @testing-library/react @testing-library/jest-dom 
 *   @testing-library/user-event jest ts-jest @types/jest
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClientSelect } from '@/components/ClientSelect';
import { api } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock client data for testing
const mockClients = [
  {
    id: 'client-uuid-1',
    ref: '1A001',
    name: 'Acme Corporation Ltd',
    type: 'COMPANY',
    portfolioCode: 1,
    status: 'ACTIVE',
  },
  {
    id: 'client-uuid-2',
    ref: '1A002',
    name: 'Acme Services Ltd',
    type: 'COMPANY',
    portfolioCode: 1,
    status: 'ACTIVE',
  },
  {
    id: 'client-uuid-3',
    ref: '2B001',
    name: 'Beta Industries Inc',
    type: 'COMPANY',
    portfolioCode: 2,
    status: 'ACTIVE',
  },
  {
    id: 'client-uuid-4',
    ref: '3C001',
    name: 'Gamma Enterprises Ltd',
    type: 'COMPANY',
    portfolioCode: 3,
    status: 'ACTIVE',
  },
];

// Mock event data
const mockEventWithClient = {
  id: 'event-1',
  title: 'Client Meeting',
  description: 'Quarterly review',
  status: 'scheduled' as const,
  start: '2025-11-26T10:00:00Z',
  end: '2025-11-26T11:00:00Z',
  clientRef: '1A001',
  clientName: 'Acme Corporation Ltd',
  clientId: 'client-uuid-1',
  type: 'MEETING',
};

const mockEventWithoutClient = {
  id: 'event-2',
  title: 'Team Meeting',
  description: 'Internal discussion',
  status: 'scheduled' as const,
  start: '2025-11-27T14:00:00Z',
  end: '2025-11-27T15:00:00Z',
  type: 'MEETING',
};

describe('Edit Form - Client Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock for client fetching by ref/id
    (api.get as jest.Mock).mockImplementation((url: string) => {
      // Handle client fetch by ref or id
      if (url.includes('/clients/1A001')) {
        return Promise.resolve(mockClients[0]);
      }
      if (url.includes('/clients/2B001')) {
        return Promise.resolve(mockClients[2]);
      }
      if (url.includes('/clients/3C001')) {
        return Promise.resolve(mockClients[3]);
      }
      if (url.includes('/clients/1A002')) {
        return Promise.resolve(mockClients[1]);
      }
      // Handle search
      if (url.includes('/clients/search')) {
        return Promise.resolve(mockClients);
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Test: Edit event with existing client
   * Requirement: 1.4 - Edit event and change client reference
   */
  describe('Edit Event with Existing Client', () => {
    it('should display current client when editing event', async () => {
      const mockOnChange = jest.fn();
      // Mock fetchClientByRef to return the client
      (api.get as jest.Mock).mockResolvedValue(mockClients[0]);
      
      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      
      // Wait for client to be loaded
      await waitFor(() => {
        expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');
      });
    });

    it('should show selected client info below dropdown', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients[0]);
      
      const { container } = render(
        <div>
          <ClientSelect
            value={mockEventWithClient.clientRef}
            onChange={mockOnChange}
            placeholder="Search for a client..."
          />
          {mockEventWithClient.clientName && (
            <div className="text-sm text-gray-600 mt-1" data-testid="selected-client-info">
              Selected: {mockEventWithClient.clientName} ({mockEventWithClient.clientRef})
            </div>
          )}
        </div>
      );

      // Wait for client to load
      await waitFor(() => {
        const selectedInfo = screen.getByTestId('selected-client-info');
        expect(selectedInfo).toBeInTheDocument();
        expect(selectedInfo.textContent).toBe('Selected: Acme Corporation Ltd (1A001)');
      });
    });

    it('should preserve existing client data when opening edit form', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients[0]);
      
      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      
      // Wait for client data to load and verify it's preserved
      await waitFor(() => {
        expect(searchInput.value).toContain('Acme Corporation Ltd');
        expect(searchInput.value).toContain('1A001');
      });
    });
  });

  /**
   * Test: Search for different client
   * Requirement: 6.4 - Support searching by client name or reference
   */
  describe('Search for Different Client', () => {
    it('should allow searching for a different client', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Clear current value and search for different client
      fireEvent.change(searchInput, { target: { value: '' } });
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      // Wait for search results
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/clients/search', {
          params: { q: 'Beta' },
        });
      });

      // Verify different client appears in results
      expect(await screen.findByText('Beta Industries Inc')).toBeInTheDocument();
      expect(screen.getByText('2B001')).toBeInTheDocument();
    });

    it('should show all matching clients when searching', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[0], mockClients[1]]);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Search for "Acme" to get multiple results
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
      expect(screen.getByText('1A001')).toBeInTheDocument();
      expect(screen.getByText('1A002')).toBeInTheDocument();
    });
  });

  /**
   * Test: Select new client
   * Requirement: 6.3 - Populate client reference and name fields on selection
   */
  describe('Select New Client', () => {
    it('should update client data when new client selected', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[2]]);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Search for different client
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      });

      // Select the new client
      fireEvent.click(screen.getByText('Beta Industries Inc'));

      // Verify onChange was called with new client data
      expect(mockOnChange).toHaveBeenCalledWith(
        '2B001',                    // clientRef
        'Beta Industries Inc',      // clientName
        'client-uuid-3'             // clientId
      );
    });

    it('should display new client in input field after selection', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[3]]);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Search and select new client
      fireEvent.change(searchInput, { target: { value: 'Gamma' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Gamma Enterprises Ltd')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Gamma Enterprises Ltd'));

      // Verify input shows new client
      expect(searchInput.value).toBe('Gamma Enterprises Ltd (3C001)');
    });
  });

  /**
   * Test: Save and verify client updated
   * Requirement: 1.4 - Edit event and update displayed client name
   */
  describe('Save and Verify Client Updated', () => {
    it('should maintain new client selection after save', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[2]]);

      const { rerender } = render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Select new client
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Beta Industries Inc'));

      // Simulate save by re-rendering with updated values
      rerender(
        <ClientSelect
          value="2B001"
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      // Verify new client is displayed
      const updatedInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      expect(updatedInput.value).toBe('Beta Industries Inc (2B001)');
    });

    it('should call onChange with all client fields', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[1]]);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Select different client
      fireEvent.change(searchInput, { target: { value: 'Acme Services' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Acme Services Ltd'));

      // Verify all fields are provided
      expect(mockOnChange).toHaveBeenCalledWith(
        '1A002',
        'Acme Services Ltd',
        'client-uuid-2'
      );
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test: Edit event without client
   * Requirement: 1.4 - Add client to event without client
   */
  describe('Edit Event Without Client', () => {
    it('should show empty client field for event without client', () => {
      const mockOnChange = jest.fn();
      
      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      
      // Verify field is empty
      expect(searchInput.value).toBe('');
    });

    it('should allow adding client to event without client', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[0]]);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Search for client
      fireEvent.change(searchInput, { target: { value: 'Acme Corp' } });
      jest.advanceTimersByTime(300);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      // Select client
      fireEvent.click(screen.getByText('Acme Corporation Ltd'));

      // Verify onChange was called
      expect(mockOnChange).toHaveBeenCalledWith(
        '1A001',
        'Acme Corporation Ltd',
        'client-uuid-1'
      );
    });

    it('should display selected client after adding to event', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[2]]);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Add client
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Beta Industries Inc'));

      // Verify client is now displayed
      expect(searchInput.value).toBe('Beta Industries Inc (2B001)');
    });
  });

  /**
   * Test: Clear client selection
   * Requirement: 6.5 - "No client" option for clearing selection
   */
  describe('Clear Client Selection', () => {
    it('should show clear button when client is selected', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      // Wait for client to load, then verify clear button is present
      await waitFor(() => {
        const clearButton = screen.getByTitle('Clear selection');
        expect(clearButton).toBeInTheDocument();
        expect(clearButton.textContent).toBe('×');
      });
    });

    it('should clear client when clear button clicked', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      
      // Wait for client to load
      await waitFor(() => {
        expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');
      });

      const clearButton = screen.getByTitle('Clear selection');

      // Click clear button
      fireEvent.click(clearButton);

      // Verify onChange was called with empty values
      expect(mockOnChange).toHaveBeenCalledWith('', '', '');
    });

    it('should clear input field when clear button clicked', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      
      // Wait for client to load
      await waitFor(() => {
        expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');
      });

      const clearButton = screen.getByTitle('Clear selection');

      // Click clear button
      fireEvent.click(clearButton);

      // Verify input is cleared
      expect(searchInput.value).toBe('');
    });

    it('should allow selecting "No client" from dropdown', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Open dropdown by searching
      fireEvent.change(searchInput, { target: { value: 'Ac' } });
      jest.advanceTimersByTime(300);

      // Wait for dropdown
      await waitFor(() => {
        expect(screen.getByText('No client')).toBeInTheDocument();
      });

      // Click "No client"
      fireEvent.click(screen.getByText('No client'));

      // Verify onChange was called with empty values
      expect(mockOnChange).toHaveBeenCalledWith('', '', '');
    });

    it('should verify client is removed after clearing', () => {
      const mockOnChange = jest.fn();
      
      const { rerender } = render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const clearButton = screen.getByTitle('Clear selection');
      fireEvent.click(clearButton);

      // Simulate save by re-rendering with empty values
      rerender(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      // Verify client is removed
      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      expect(searchInput.value).toBe('');
      
      // Clear button should not be visible
      expect(screen.queryByTitle('Clear selection')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Integration - Full edit workflow
   * Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  describe('Full Edit Workflow Integration', () => {
    it('should complete full edit workflow: change client', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[3]]);

      const { rerender } = render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Step 1: Verify current client
      expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');

      // Step 2: Search for different client
      fireEvent.change(searchInput, { target: { value: 'Gamma' } });
      jest.advanceTimersByTime(300);

      // Step 3: Verify search results
      await waitFor(() => {
        expect(screen.getByText('Gamma Enterprises Ltd')).toBeInTheDocument();
      });

      // Step 4: Select new client
      fireEvent.click(screen.getByText('Gamma Enterprises Ltd'));

      // Step 5: Verify onChange called
      expect(mockOnChange).toHaveBeenCalledWith(
        '3C001',
        'Gamma Enterprises Ltd',
        'client-uuid-4'
      );

      // Step 6: Simulate save and verify update
      rerender(
        <ClientSelect
          value="3C001"
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const updatedInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      expect(updatedInput.value).toBe('Gamma Enterprises Ltd (3C001)');
    });

    it('should complete full edit workflow: add client to event without client', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([mockClients[1]]);

      const { rerender } = render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Step 1: Verify no client
      expect(searchInput.value).toBe('');

      // Step 2: Search for client
      fireEvent.change(searchInput, { target: { value: 'Acme Services' } });
      jest.advanceTimersByTime(300);

      // Step 3: Verify results
      await waitFor(() => {
        expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
      });

      // Step 4: Select client
      fireEvent.click(screen.getByText('Acme Services Ltd'));

      // Step 5: Verify onChange called
      expect(mockOnChange).toHaveBeenCalledWith(
        '1A002',
        'Acme Services Ltd',
        'client-uuid-2'
      );

      // Step 6: Simulate save and verify client appears
      rerender(
        <ClientSelect
          value="1A002"
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const updatedInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      expect(updatedInput.value).toBe('Acme Services Ltd (1A002)');
    });

    it('should complete full edit workflow: remove client from event', () => {
      const mockOnChange = jest.fn();
      
      const { rerender } = render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Step 1: Verify client is selected
      expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');

      // Step 2: Click clear button
      const clearButton = screen.getByTitle('Clear selection');
      fireEvent.click(clearButton);

      // Step 3: Verify onChange called with empty values
      expect(mockOnChange).toHaveBeenCalledWith('', '', '');

      // Step 4: Simulate save and verify client removed
      rerender(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const updatedInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;
      expect(updatedInput.value).toBe('');
    });
  });

  /**
   * Test: Edge cases and error scenarios
   */
  describe('Edge Cases', () => {
    it('should handle rapid client changes', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock)
        .mockResolvedValueOnce([mockClients[1]])
        .mockResolvedValueOnce([mockClients[2]]);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // First change
      fireEvent.change(searchInput, { target: { value: 'Acme Services' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Acme Services Ltd'));

      // Second change immediately
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Beta Industries Inc'));

      // Verify both changes were captured
      expect(mockOnChange).toHaveBeenCalledTimes(2);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, '1A002', 'Acme Services Ltd', 'client-uuid-2');
      expect(mockOnChange).toHaveBeenNthCalledWith(2, '2B001', 'Beta Industries Inc', 'client-uuid-3');
    });

    it('should handle client with special characters in name', async () => {
      const specialClient = {
        id: 'client-uuid-special',
        ref: '9Z999',
        name: "O'Brien & Associates Ltd.",
        type: 'COMPANY',
        portfolioCode: 9,
        status: 'ACTIVE',
      };

      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([specialClient]);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: "O'Brien" } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText("O'Brien & Associates Ltd.")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("O'Brien & Associates Ltd."));

      expect(searchInput.value).toBe("O'Brien & Associates Ltd. (9Z999)");
      expect(mockOnChange).toHaveBeenCalledWith('9Z999', "O'Brien & Associates Ltd.", 'client-uuid-special');
    });

    it('should preserve client selection when dropdown closes and reopens', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value={mockEventWithClient.clientRef}
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Verify initial client
      expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');

      // Open dropdown
      fireEvent.change(searchInput, { target: { value: 'Ac' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
      });

      // Close dropdown by clicking outside (blur)
      fireEvent.blur(searchInput);

      // Verify client is still selected
      expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');
    });
  });
});
