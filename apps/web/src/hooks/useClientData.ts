import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Client } from '@/lib/types';

/**
 * Simplified client data structure for calendar/event usage
 */
export interface ClientData {
  id: string;
  identifier: string;
  name: string;
  type: string;
  portfolioCode: number | null;
}

/**
 * Return type for the useClientData hook
 */
export interface UseClientDataReturn {
  clients: Map<string, ClientData>;
  loading: boolean;
  error: string | null;
  fetchClientByIdentifier: (identifier: string) => Promise<ClientData | null>;
  fetchClientById: (id: string) => Promise<ClientData | null>;
  searchClients: (query: string) => Promise<ClientData[]>;
}

/**
 * Custom hook for managing client data with caching
 * 
 * Provides functions to fetch client data by reference or ID,
 * search for clients, and maintains a cache to minimize API calls.
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */
export function useClientData(): UseClientDataReturn {
  const [clients, setClients] = useState<Map<string, ClientData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert full Client object to simplified ClientData
   */
  const toClientData = useCallback((client: Client): ClientData => {
    return {
      id: client.id,
      identifier: client.registeredNumber || client.id,
      name: client.name,
      type: client.type,
      portfolioCode: client.portfolioCode || null,
    };
  }, []);

  /**
   * Fetch client by identifier (registered number or ID)
   * Checks cache first before making API call
   * 
   * Requirement 2.1: Fetch client details for events with client references
   * Requirement 2.5: Cache client data to minimize API calls
   * Requirement 8.1: Handle client not found scenario
   * Requirement 8.2: Handle network errors
   * Requirement 8.4: Add error logging for debugging
   */
  const fetchClientByIdentifier = useCallback(async (identifier: string): Promise<ClientData | null> => {
    if (!identifier?.trim()) return null;

    // Check cache first - search by identifier
    const cached = Array.from(clients.values()).find(c => c.identifier === identifier);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useClientData] Cache hit for identifier: ${identifier}`);
      }
      return cached;
    }

    setLoading(true);
    setError(null);
    
    try {
      // API call to get client by identifier
      // The backend supports UUID or registered number in the same endpoint
      const client = await api.get<Client>(`/clients/${identifier}`);
      
      const clientData = toClientData(client);
      
      // Update cache
      setClients(prev => new Map(prev).set(clientData.id, clientData));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useClientData] Fetched and cached client by identifier: ${identifier}`);
      }
      
      return clientData;
    } catch (err: any) {
      // Requirement 8.4: Enhanced error logging for debugging
      const errorMessage = err?.message || 'Failed to fetch client';
      const errorStatus = err?.response?.status;
      
      // Requirement 8.1: Distinguish between "not found" and other errors
      if (errorStatus === 404) {
        const notFoundMessage = `Client not found: ${identifier}`;
        setError(notFoundMessage);
        console.warn(`[useClientData] ${notFoundMessage}`);
      } else {
        // Requirement 8.2: Handle network errors
        setError(errorMessage);
        console.error(`[useClientData] Error fetching client by identifier ${identifier}:`, {
          message: errorMessage,
          status: errorStatus,
          error: err
        });
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [clients, toClientData]);

  /**
   * Fetch client by reference (Standard B)
   * Checks cache first before making API call
   * 
   * Requirement 2.1: Fetch client details for events with client IDs
   * Requirement 2.5: Cache client data to minimize API calls
   * Requirement 8.1: Handle client not found scenario
   * Requirement 8.2: Handle network errors
   * Requirement 8.4: Add error logging for debugging
   */
  const fetchClientById = useCallback(async (id: string): Promise<ClientData | null> => {
    if (!id?.trim()) return null;

    // Check cache first
    if (clients.has(id)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useClientData] Cache hit for id: ${id}`);
      }
      return clients.get(id)!;
    }

    setLoading(true);
    setError(null);
    
    try {
      const client = await api.get<Client>(`/clients/${id}`);
      
      const clientData = toClientData(client);
      
      // Update cache
      setClients(prev => new Map(prev).set(clientData.id, clientData));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useClientData] Fetched and cached client by id: ${id}`);
      }
      
      return clientData;
    } catch (err: any) {
      // Requirement 8.4: Enhanced error logging for debugging
      const errorMessage = err?.message || 'Failed to fetch client';
      const errorStatus = err?.response?.status;
      
      // Requirement 8.1: Distinguish between "not found" and other errors
      if (errorStatus === 404) {
        const notFoundMessage = `Client not found: ${id}`;
        setError(notFoundMessage);
        console.warn(`[useClientData] ${notFoundMessage}`);
      } else {
        // Requirement 8.2: Handle network errors
        setError(errorMessage);
        console.error(`[useClientData] Error fetching client by id ${id}:`, {
          message: errorMessage,
          status: errorStatus,
          error: err
        });
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [clients, toClientData]);

  /**
   * Search clients by name or reference
   * Returns array of matching clients and updates cache
   * 
   * Requirement 2.2: Validate reference and fetch client name
   * Requirement 2.4: Display loading indicator during fetch
   * Requirement 2.5: Cache search results
   * Requirement 8.2: Handle network errors
   * Requirement 8.4: Add error logging for debugging
   */
  const searchClients = useCallback(async (query: string): Promise<ClientData[]> => {
    if (!query?.trim()) return [];

    setLoading(true);
    setError(null);
    
    try {
      // Search clients using the search endpoint
      const results = await api.get<Client[]>('/clients/search', { 
        params: { q: query } 
      });
      
      // Convert to ClientData format
      const clientDataResults = results.map(toClientData);
      
      // Update cache with all results
      setClients(prev => {
        const newMap = new Map(prev);
        clientDataResults.forEach(client => newMap.set(client.id, client));
        return newMap;
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useClientData] Search for "${query}" returned ${clientDataResults.length} results`);
      }
      
      return clientDataResults;
    } catch (err: any) {
      // Requirement 8.4: Enhanced error logging for debugging
      const errorMessage = err?.message || 'Failed to search clients';
      const errorStatus = err?.response?.status;
      
      // Requirement 8.2: Handle network errors with detailed logging
      setError(errorMessage);
      console.error(`[useClientData] Error searching clients with query "${query}":`, {
        message: errorMessage,
        status: errorStatus,
        error: err
      });
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [toClientData]);

  return {
    clients,
    loading,
    error,
    fetchClientByIdentifier,
    fetchClientById,
    searchClients,
  };
}
