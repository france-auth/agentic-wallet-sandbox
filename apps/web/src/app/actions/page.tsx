import { ActionsClient } from '../components/ActionsClient';
import { api } from '../lib/api';

export const revalidate = 0;

export default async function ActionsPage() {
  const actionsRes = await api.getActions({ limit: 20, offset: 0 }).catch(() => ({
    actions: [],
    total: 0,
    limit: 20,
    offset: 0,
  }));
  const agentsRes = await api.getAgents().catch(() => ({ agents: [], count: 0 }));

  return (
    <ActionsClient
      initialActions={actionsRes.actions}
      initialTotal={actionsRes.total}
      agents={agentsRes.agents}
    />
  );
}
