/**
 * Test Suite: Client Selection in Create Event Form
 * 
 * This test suite validates the client selection functionality in the create event form.
 * 
 * Requirements tested:
 * - 1.3: Create new event with client reference and fetch client name
 * - 6.1: Client selection dropdown/autocomplete
 * - 6.2: Display client names with references
 * - 6.3: Populate client reference and name fields on selection
 * - 6.4: Support searching by client name or reference
 * - 6.5: "No client" option for clearing selection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
];

describe('Create Form - Client Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Test: Open create event form
   * Requirement: 1.3 - Create new event with client reference
   */
  describe('Form Rendering', () => {
    it('should render client search field in create form', () => {
      const mockOnChange = jest.fn();
      
      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should render with custom placeholder', () => {
      const mockOnChange = jest.fn();
      
      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Find a client"
        />
      );

      expect(screen.getByPlaceholderText('Find a client')).toBeInTheDocument();
    });
  });

  /**
   * Test: Type in client search field (test debouncing)
   * Requirement: 6.4 - Support searching by client name or reference
   */
  describe('Search Debouncing', () => {
    it('should debounce search requests (300ms)', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type quickly - should not trigger search immediately
      fireEvent.change(searchInput, { target: { value: 'A' } });
      expect(api.get).not.toHaveBeenCalled();

      fireEvent.change(searchInput, { target: { value: 'Ac' } });
      expect(api.get).not.toHaveBeenCalled();

      fireEvent.change(searchInput, { target: { value: 'Acm' } });
      expect(api.get).not.toHaveBeenCalled();

      // Wait for debounce (300ms)
      jest.advanceTimersByTime(300);

      // Now search should be triggered
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('/clients/search', {
          params: { q: 'Acm' },
        });
      });
    });

    it('should cancel previous search when typing continues', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type "Ac"
      fireEvent.change(searchInput, { target: { value: 'Ac' } });
      
      // Wait 200ms (not enough for debounce)
      jest.advanceTimersByTime(200);
      
      // Type more before debounce completes
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      
      // Wait for debounce
      jest.advanceTimersByTime(300);

      // Should only search once with the final query
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(api.get).toHaveBeenCalledWith('/clients/search', {
          params: { q: 'Acme' },
        });
      });
    });
  });

  /**
   * Test: Verify search results appear after 2+ characters
   * Requirement: 6.1 - Client selection dropdown
   */
  describe('Search Activation', () => {
    it('should not search with less than 2 characters', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type 1 character
      fireEvent.change(searchInput, { target: { value: 'A' } });
      jest.advanceTimersByTime(300);

      // Should not trigger search
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should search with 2 or more characters', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type 2 characters
      fireEvent.change(searchInput, { target: { value: 'Ac' } });
      jest.advanceTimersByTime(300);

      // Should trigger search
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/clients/search', {
          params: { q: 'Ac' },
        });
      });
    });
  });

  /**
   * Test: Verify results show name and reference
   * Requirement: 6.2 - Display client names with references
   */
  describe('Search Results Display', () => {
    it('should display search results with name and reference', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      // Verify all results are displayed with names and references
      expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      expect(screen.getByText('1A001')).toBeInTheDocument();
      expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
      expect(screen.getByText('1A002')).toBeInTheDocument();
      expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      expect(screen.getByText('2B001')).toBeInTheDocument();
    });

    it('should show "No clients found" when no results', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue([]);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
      jest.advanceTimersByTime(300);

      // Wait for "No clients found" message
      await waitFor(() => {
        expect(screen.getByText('No clients found')).toBeInTheDocument();
      });
    });

    it('should show loading indicator during search', async () => {
      const mockOnChange = jest.fn();
      // Delay the API response to test loading state
      (api.get as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockClients), 100))
      );

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      // Loading indicator should be visible
      await waitFor(() => {
        const loadingSpinner = searchInput.parentElement?.querySelector('[style*="animation"]');
        expect(loadingSpinner).toBeInTheDocument();
      });

      // Wait for results
      jest.advanceTimersByTime(100);
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Select a client
   * Requirement: 6.3 - Populate client reference and name fields on selection
   */
  describe('Client Selection', () => {
    it('should call onChange with client data when selected', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      // Click on first result
      const firstResult = screen.getByText('Acme Corporation Ltd');
      fireEvent.click(firstResult);

      // Verify onChange was called with correct data
      expect(mockOnChange).toHaveBeenCalledWith(
        '1A001',                    // clientRef
        'Acme Corporation Ltd',     // clientName
        'client-uuid-1'             // clientId
      );
    });

    it('should update input field with selected client', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      });

      // Click on result
      const result = screen.getByText('Beta Industries Inc');
      fireEvent.click(result);

      // Verify input shows selected client
      expect(searchInput.value).toBe('Beta Industries Inc (2B001)');
    });

    it('should close dropdown after selection', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      // Click on result
      const result = screen.getByText('Acme Corporation Ltd');
      fireEvent.click(result);

      // Dropdown should be closed (results not visible)
      await waitFor(() => {
        expect(screen.queryByText('Acme Services Ltd')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Test: "No client" option
   * Requirement: 6.5 - "No client" option for clearing selection
   */
  describe('Clear Selection', () => {
    it('should show "No client" option in dropdown', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      // Wait for dropdown
      await waitFor(() => {
        expect(screen.getByText('No client')).toBeInTheDocument();
      });

      // Verify "Clear selection" text is also present
      expect(screen.getByText('Clear selection')).toBeInTheDocument();
    });

    it('should clear selection when "No client" is clicked', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Type search query and select a client
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Acme Corporation Ltd'));

      // Verify client is selected
      expect(searchInput.value).toBe('Acme Corporation Ltd (1A001)');

      // Open dropdown again
      fireEvent.change(searchInput, { target: { value: 'Ac' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('No client')).toBeInTheDocument();
      });

      // Click "No client"
      fireEvent.click(screen.getByText('No client'));

      // Verify onChange was called with empty values
      expect(mockOnChange).toHaveBeenCalledWith('', '', '');

      // Verify input is cleared
      expect(searchInput.value).toBe('');
    });

    it('should show clear button (×) when client is selected', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...');

      // Type search query and select a client
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Acme Corporation Ltd'));

      // Verify clear button appears
      await waitFor(() => {
        const clearButton = screen.getByTitle('Clear selection');
        expect(clearButton).toBeInTheDocument();
        expect(clearButton.textContent).toBe('×');
      });
    });

    it('should clear selection when clear button (×) is clicked', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Type search query and select a client
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Beta Industries Inc')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Beta Industries Inc'));

      // Verify client is selected
      expect(searchInput.value).toBe('Beta Industries Inc (2B001)');

      // Click clear button
      const clearButton = await screen.findByTitle('Clear selection');
      fireEvent.click(clearButton);

      // Verify onChange was called with empty values
      expect(mockOnChange).toHaveBeenCalledWith('', '', '');

      // Verify input is cleared
      expect(searchInput.value).toBe('');
    });
  });

  /**
   * Test: Search by client reference
   * Requirement: 6.4 - Support searching by client name or reference
   */
  describe('Search by Reference', () => {
    it('should search by client reference', async () => {
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

      // Type client reference
      fireEvent.change(searchInput, { target: { value: '1A001' } });
      jest.advanceTimersByTime(300);

      // Verify search was called with reference
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/clients/search', {
          params: { q: '1A001' },
        });
      });

      // Verify result is displayed
      expect(await screen.findByText('Acme Corporation Ltd')).toBeInTheDocument();
      expect(screen.getByText('1A001')).toBeInTheDocument();
    });
  });

  /**
   * Test: Integration - Full workflow
   * Requirements: 1.3, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  describe('Full Workflow Integration', () => {
    it('should complete full client selection workflow', async () => {
      const mockOnChange = jest.fn();
      (api.get as jest.Mock).mockResolvedValue(mockClients);

      render(
        <ClientSelect
          value=""
          onChange={mockOnChange}
          placeholder="Search for a client..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search for a client...') as HTMLInputElement;

      // Step 1: Type in search field
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      
      // Step 2: Wait for debounce
      jest.advanceTimersByTime(300);

      // Step 3: Verify search results appear
      await waitFor(() => {
        expect(screen.getByText('Acme Corporation Ltd')).toBeInTheDocument();
        expect(screen.getByText('1A001')).toBeInTheDocument();
        expect(screen.getByText('Acme Services Ltd')).toBeInTheDocument();
        expect(screen.getByText('1A002')).toBeInTheDocument();
      });

      // Step 4: Select a client
      fireEvent.click(screen.getByText('Acme Services Ltd'));

      // Step 5: Verify client data populated
      expect(mockOnChange).toHaveBeenCalledWith(
        '1A002',
        'Acme Services Ltd',
        'client-uuid-2'
      );

      // Step 6: Verify input shows selected client
      expect(searchInput.value).toBe('Acme Services Ltd (1A002)');

      // Step 7: Verify dropdown closed
      expect(screen.queryByText('Acme Corporation Ltd')).not.toBeInTheDocument();
    });
  });
});
