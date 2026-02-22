'use client';

import { useParams } from 'next/navigation';

export function useClientRouteId(): string {
  const params = useParams<{ id?: string }>();
  const id = String(params?.id || '').trim();
  if (!id || id === 'undefined' || id === 'null') return '';
  return id;
}
