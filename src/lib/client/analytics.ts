/** Analytics dashboard endpoints. Each returns its own bespoke envelope (data + summary), so we keep the raw JSON. */

async function getRaw(path: string): Promise<any> {
  const res = await fetch(path, { credentials: 'same-origin' });
  return res.json();
}

export const analyticsApi = {
  contentRoi: () => getRaw('/api/v1/analytics/content-roi'),
  agentLeaderboard: () => getRaw('/api/v1/analytics/agent-leaderboard'),
  funnel: () => getRaw('/api/v1/analytics/funnel'),
  cashFlow: () => getRaw('/api/v1/analytics/cash-flow'),
};
