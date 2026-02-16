import { redirect } from 'next/navigation';

export default async function ClientWorkTabRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clients/${id}?tab=work&workTab=services`);
}

