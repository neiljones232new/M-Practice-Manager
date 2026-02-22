import { api } from '@/lib/api';
import type { ClientContextWithParties } from '@/lib/types';

export const clientsApi = {
  getWithParties: (clientId: string, tick?: number) =>
    api.get<ClientContextWithParties>(`/clients/${clientId}/with-parties`, tick !== undefined ? { params: { t: tick } } : undefined),
  getServices: (clientId: string) => api.get(`/clients/${clientId}/services`),
  updateClient: (clientId: string, payload: Record<string, unknown>) => api.put(`/clients/${clientId}`, payload),
  updateProfile: (clientId: string, payload: Record<string, unknown>) => api.put(`/clients/${clientId}/profile`, payload),
};
