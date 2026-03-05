import { api } from './lib/api';
import { DashboardClient } from './components/DashboardClient';

export const revalidate = 0;

export default async function DashboardPage() {
  const [agentsRes, healthRes, actionsRes] = await Promise.allSettled([
    api.getAgents(),
    api.getHealth(),
    api.getActions({ limit: 5 }),
  ]);

  const agents = agentsRes.status === 'fulfilled' ? agentsRes.value.agents : [];
  const health = healthRes.status === 'fulfilled' ? healthRes.value : null;
  const recentActions = actionsRes.status === 'fulfilled' ? actionsRes.value.actions : [];

  return (
    <DashboardClient
      initialAgents={agents}
      initialHealth={health}
      initialRecentActions={recentActions}
    />
  );
}
