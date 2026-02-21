export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  accentColor: string;
}

export interface AuthSession {
  user: AppUser;
}

export interface LeagueSummary {
  leagueId: string;
  name: string;
  code: string;
  memberCount: number;
  myCash: number;
  startingBankroll: number;
  createdAt: number;
}

export interface LeagueMemberRow {
  memberId: string;
  userId: string;
  displayName: string;
  username: string;
  accentColor: string;
  cash: number;
  invested: number;
  joinedAt: number;
}

export interface PositionRow {
  _id: string;
  leagueId: string;
  userId: string;
  marketId: string;
  marketSlug?: string;
  marketQuestion: string;
  outcome: string;
  shares: number;
  totalCost: number;
  averagePrice: number;
  lastPrice: number;
  updatedAt: number;
}

export interface BetRow {
  _id: string;
  leagueId: string;
  userId: string;
  marketId: string;
  marketSlug?: string;
  marketQuestion: string;
  outcome: string;
  price: number;
  stake: number;
  shares: number;
  createdAt: number;
  displayName: string;
  username: string;
}

export interface LeagueDetail {
  league: {
    leagueId: string;
    name: string;
    code: string;
    startingBankroll: number;
    createdAt: number;
  };
  viewer: {
    userId: string;
    cash: number;
  };
  members: LeagueMemberRow[];
  positions: PositionRow[];
  recentBets: BetRow[];
}

export interface PolymarketOutcome {
  name: string;
  price: number;
}

export interface PolymarketMarket {
  marketId: string;
  question: string;
  slug?: string;
  outcomes: PolymarketOutcome[];
  clobTokenIds: string[];
  active: boolean;
  closed: boolean;
  endDate?: string;
  volume: number;
  liquidity: number;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolymarketHistoryPoint {
  timestamp: number;
  price: number;
}

export interface PolymarketTag {
  id: string;
  slug: string;
  label: string;
}

export interface LeagueStanding {
  userId: string;
  displayName: string;
  username: string;
  accentColor: string;
  cash: number;
  invested: number;
  positionValue: number;
  equity: number;
  pnl: number;
}

export interface EnrichedPosition extends PositionRow {
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
}
