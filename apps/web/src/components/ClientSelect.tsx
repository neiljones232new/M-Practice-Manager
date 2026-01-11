'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useClientData, type ClientData } from '@/hooks/useClientData';

/**
 * Props for the ClientSelect component
 */
export interface ClientSelectProps {
  /** Current selected client reference or ID */
  value?: string;
  /** Callback when a client is selected - provides ref, name, and id */
  onChange: (clientRef: string, clientName: string, clientId: string) => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Callback for validation errors - Requirement 8.3 */
  onValidationError?: (error: string | null) => void;
}

/**
 * ClientSelect Component
 * 
 * A searchable dropdown component for selecting clients by name or reference.
 * Features:
 * - Debounced search (300ms) to minimize API calls
 * - Displays client name and reference in results
 * - Shows loading indicator during search
 * - Handles "No clients found" state
 * - Supports clearing selection with "No client" option
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function ClientSelect({
  value,
  onChange,
  placeholder = 'Search client by name or reference...',
  required = false,
  disabled = false,
  onValidationError,
}: ClientSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientData[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  // Requirement 8.2: Access error state for displaying error messages
  const { searchClients, loading, error, fetchClientByRef, fetchClientById } = useClientData();
  // Requirement 8.3: Track validation errors for invalid client references
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial client data if value is provided
  // Requirement 8.1: Handle client not found scenario
  useEffect(() => {
    if (value && !selectedClient) {
      const loadClient = async () => {
        // Try to fetch by ref first, then by ID
        let client = await fetchClientByRef(value);
        if (!client) {
          client = await fetchClientById(value);
        }
        if (client) {
          setSelectedClient(client);
          setQuery(`${client.name} (${client.ref})`);
          setValidationError(null);
          onValidationError?.(null);
        } else if (value) {
          // Requirement 8.1: Client not found - set validation error
          const notFoundError = `Client "${value}" not found`;
          setValidationError(notFoundError);
          onValidationError?.(notFoundError);
          setQuery(value);
        }
      };
      loadClient();
    }
  }, [value, selectedClient, fetchClientByRef, fetchClientById, onValidationError]);

  // Debounced search effect (300ms)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        const clients = await searchClients(query);
        setResults(clients);
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchClients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle client selection from dropdown
   * Requirement 6.3: Populate both client reference and client name fields
   * Requirement 8.3: Clear validation errors on valid selection
   */
  const handleSelect = (client: ClientData) => {
    setSelectedClient(client);
    onChange(client.ref, client.name, client.id);
    setQuery(`${client.name} (${client.ref})`);
    setShowDropdown(false);
    setValidationError(null);
    onValidationError?.(null);
  };

  /**
   * Handle clearing the selection
   * Requirement 6.5: "No client" option for clearing selection
   * Requirement 8.3: Clear validation errors when clearing selection
   */
  const handleClear = () => {
    setSelectedClient(null);
    onChange('', '', '');
    setQuery('');
    setShowDropdown(false);
    setValidationError(null);
    onValidationError?.(null);
    inputRef.current?.focus();
  };

  /**
   * Handle input change
   * Clears selected client when user starts typing
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear selection if user modifies the input
    if (selectedClient && newQuery !== `${selectedClient.name} (${selectedClient.ref})`) {
      setSelectedClient(null);
    }
  };

  /**
   * Handle input focus
   * Shows dropdown if there are results
   */
  const handleFocus = () => {
    if (query.length >= 2 && results.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Search Input - Requirement 6.1 */}
      <input
        ref={inputRef}
        type="text"
        className="input-mdj"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        required={required}
        disabled={disabled}
        style={{
          paddingRight: loading || selectedClient ? '2.5rem' : '0.9rem',
        }}
      />

      {/* Loading Indicator - Requirement 6.2 (show loading during search) */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--border)',
              borderTop: '2px solid var(--brand-primary)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        </div>
      )}

      {/* Clear Button - Requirement 6.5 */}
      {selectedClient && !loading && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
          title="Clear selection"
        >
          ×
        </button>
      )}

      {/* Dropdown Results - Requirement 6.2 (display search results) */}
      {showDropdown && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            zIndex: 1000,
            width: '100%',
            marginTop: '0.25rem',
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 6px 14px rgba(0,0,0,0.1)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {/* "No client" option - Requirement 6.5 */}
          {query.length >= 2 && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-soft)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                fontStyle: 'italic',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>No client</span>
              <span style={{ fontSize: '0.75rem' }}>Clear selection</span>
            </button>
          )}

          {/* Requirement 8.2: Display error message with retry option */}
          {error && query.length >= 2 && !loading && (
            <div
              style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#dc2626',
                fontSize: '0.9rem',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                ⚠ {error}
              </div>
              <button
                type="button"
                onClick={() => {
                  // Retry search by triggering the effect again
                  const currentQuery = query;
                  setQuery('');
                  setTimeout(() => setQuery(currentQuery), 0);
                }}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--brand-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Client Results - Requirement 6.2 (display client name and reference) */}
          {results.length > 0 ? (
            results.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-soft)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>
                  {client.name}
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}
                >
                  {client.ref}
                </span>
              </button>
            ))
          ) : (
            /* No Results Message - Requirement 6.2 */
            query.length >= 2 &&
            !loading &&
            !error && (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                No clients found
              </div>
            )
          )}
        </div>
      )}

      {/* Requirement 8.3: Display validation error for invalid client references */}
      {validationError && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #dc2626',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Spinner Animation */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
