import type { EnrichedPosition, LeagueDetail, LeagueStanding } from "@polymockit/effect-services";

const currency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const keyOf = (marketId: string, outcome: string) => `${marketId}::${outcome.toLowerCase()}`;

export const marketOutcomeKey = keyOf;

export function buildLeagueAnalytics(
  leagueDetail: LeagueDetail,
  latestPrices: ReadonlyMap<string, number>,
): {
  standings: LeagueStanding[];
  positions: EnrichedPosition[];
} {
  const members = leagueDetail.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    username: member.username,
    accentColor: member.accentColor,
    cash: member.cash,
    invested: member.invested,
    positionValue: 0,
    equity: member.cash,
    pnl: currency(member.cash - leagueDetail.league.startingBankroll),
  }));

  const memberByUserId = new Map(members.map((member) => [member.userId, member]));

  const positions = leagueDetail.positions.map((position) => {
    const quote = latestPrices.get(keyOf(position.marketId, position.outcome)) ?? position.lastPrice;
    const currentValue = currency(position.shares * quote);
    const unrealizedPnl = currency(currentValue - position.totalCost);

    const bucket = memberByUserId.get(position.userId);
    if (bucket) {
      bucket.positionValue = currency(bucket.positionValue + currentValue);
      bucket.equity = currency(bucket.cash + bucket.positionValue);
      bucket.pnl = currency(bucket.equity - leagueDetail.league.startingBankroll);
    }

    return {
      ...position,
      currentPrice: quote,
      currentValue,
      unrealizedPnl,
    };
  });

  const standings = Array.from(memberByUserId.values()).sort((a, b) => b.equity - a.equity);
  const orderedPositions = positions.sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    standings,
    positions: orderedPositions,
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const formatDateTime = (value: number) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const shortMarket = (question: string) => (question.length > 140 ? `${question.slice(0, 137)}...` : question);
