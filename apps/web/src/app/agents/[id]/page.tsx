import { notFound } from 'next/navigation';
import { api } from '../../lib/api';
import { AgentDetailClient } from '../../components/AgentDetailClient';

export const revalidate = 0;

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const [agentRes, actionsRes] = await Promise.allSettled([
    api.getAgent(params.id),
    api.getActions({ agentId: params.id, limit: 15 }),
  ]);

  if (agentRes.status === 'rejected') {
    notFound();
  }

  return (
    <AgentDetailClient
      agent={agentRes.value.agent}
      initialActions={actionsRes.status === 'fulfilled' ? actionsRes.value.actions : []}
    />
  );
}
