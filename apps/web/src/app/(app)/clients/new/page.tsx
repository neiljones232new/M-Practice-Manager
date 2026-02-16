'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MDJShell from '@/components/mdj-ui/MDJShell';

export default function NewClientPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/clients/new/wizard');
  }, [router]);

  return (
    <MDJShell
      pageTitle="Add New Client"
      pageSubtitle="Redirecting to the guided wizard…"
      actions={[{ label: 'Back to Clients', href: '/clients', variant: 'outline' }]}
    >
      <div className="card-mdj" style={{ padding: '1rem' }}>Loading…</div>
    </MDJShell>
  );
}
