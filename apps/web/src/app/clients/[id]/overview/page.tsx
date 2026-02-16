import { redirect } from 'next/navigation';

export default async function ClientOverviewTabRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clients/${id}?tab=overview`);
}

