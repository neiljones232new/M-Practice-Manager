import { redirect } from 'next/navigation';

export default function ClientRootPage({
  params,
}: {
  params: { id?: string };
}) {
  const id = String(params?.id || '').trim();
  if (!id || id === 'undefined' || id === 'null') {
    redirect('/clients');
  }
  redirect(`/clients/${id}/overview`);
}
