import type {
  AppUser,
  EnrichedPosition,
  LeagueDetail,
  LeagueStanding,
  PolymarketHistoryPoint,
  LeagueSummary,
  PolymarketMarket,
  PolymarketTag,
} from "@polymockit/effect-services";
import { FantasyLeagueClient, PolymarketClient } from "@polymockit/effect-services";
import { useConvexAuth } from "convex/react";
import { Effect } from "effect";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getRuntimeConfigError, runAppEffect } from "./effect/runtime";
import { signIn, signOut } from "./shoo";
import {
  buildLeagueAnalytics,
  formatCurrency,
  formatDateTime,
  formatPercent,
  marketOutcomeKey,
  shortMarket,
} from "./lib/analytics";

const runtimeConfigError = getRuntimeConfigError();

const defaultCreateLeague = {
  name: "",
  bankroll: "10000",
};
const MAX_MARKET_ROWS = 40;
const MAX_LEADERBOARD_ROWS = 6;
const MAX_POSITIONS_ROWS = 5;
const MAX_RECENT_BETS_ROWS = 5;
type AppRoute = "desk" | "leagues";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error. Please try again.";
}

function PriceHistoryChart({ points }: { points: PolymarketHistoryPoint[] }) {
  const width = 560;
  const height = 164;
  const padding = 10;
  const chartHeight = height - padding * 2;
  const toY = (price: number) => {
    const clamped = Math.min(Math.max(price, 0), 1);
    return height - padding - clamped * chartHeight;
  };
  const hasLine = points.length >= 2;
  const path = hasLine
    ? points
        .map((point, index) => {
          const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
          const y = toY(point.price);
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ")
    : "";

  return (
    <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Outcome price history">
      <line x1={padding} y1={padding} x2={width - padding} y2={padding} className="history-guide" />
      <line
        x1={padding}
        y1={Math.round(height / 2)}
        x2={width - padding}
        y2={Math.round(height / 2)}
        className="history-guide"
      />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="history-guide" />
      {hasLine ? (
        <path d={path} fill="none" stroke="#2ad4b7" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <text x={width / 2} y={height / 2} textAnchor="middle" className="history-empty-text">
          Not enough history points yet.
        </text>
      )}
    </svg>
  );
}

export default function App() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
    window.location.pathname.startsWith("/leagues") ? "leagues" : "desk",
  );
  const [booting, setBooting] = useState(!runtimeConfigError);
  const [session, setSession] = useState<{ user: AppUser } | null>(null);
  const [createLeagueForm, setCreateLeagueForm] = useState(defaultCreateLeague);
  const [joinCode, setJoinCode] = useState("");
  const [stakeInput, setStakeInput] = useState("100");
  const [feedMode, setFeedMode] = useState<"trending" | "recent">("trending");
  const [slugInput, setSlugInput] = useState("");
  const [selectedTagSlug, setSelectedTagSlug] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState("");

  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagueDetail, setLeagueDetail] = useState<LeagueDetail | null>(null);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);

  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [tags, setTags] = useState<PolymarketTag[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [marketHistory, setMarketHistory] = useState<PolymarketHistoryPoint[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isOpeningSlug, setIsOpeningSlug] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isRefreshingLeague, setIsRefreshingLeague] = useState(true);
  const [isRefreshingMarkets, setIsRefreshingMarkets] = useState(false);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.leagueId === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId],
  );

  const selectedMarket = useMemo(
    () => markets.find((market) => market.marketId === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );
  const historyStats = useMemo(() => {
    if (marketHistory.length === 0) {
      return null;
    }
    const latest = marketHistory[marketHistory.length - 1]?.price ?? 0;
    const high = Math.max(...marketHistory.map((point) => point.price));
    const low = Math.min(...marketHistory.map((point) => point.price));
    return { latest, high, low };
  }, [marketHistory]);
  const visibleTags = useMemo(() => {
    const needle = tagSearch.trim().toLowerCase();
    if (!needle) {
      return tags;
    }
    return tags.filter((tag) => tag.label.toLowerCase().includes(needle) || tag.slug.toLowerCase().includes(needle));
  }, [tagSearch, tags]);

  const clearBanner = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const navigateTo = useCallback((next: AppRoute) => {
    const nextPath = next === "leagues" ? "/leagues" : "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setCurrentRoute(next);
  }, []);

  const loadMarkets = useCallback(
    async (overrides?: { mode?: "trending" | "recent"; tagSlug?: string | null }) => {
      const requestedMode = overrides?.mode ?? feedMode;
      const requestedTag = overrides ? (overrides.tagSlug ?? null) : selectedTagSlug;
    setIsRefreshingMarkets(true);
    try {
      const list = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* polymarket.listMarkets({
              mode: requestedMode,
              tagSlug: requestedTag ?? undefined,
            limit: 100,
          });
        }),
      );

      setMarkets(list);
      setSelectedMarketId((prev) => {
        if (prev && list.some((market) => market.marketId === prev)) {
          return prev;
        }
        return list[0]?.marketId ?? null;
      });
    } catch (loadError) {
      setError(extractErrorMessage(loadError));
    } finally {
      setIsRefreshingMarkets(false);
    }
    },
    [feedMode, selectedTagSlug],
  );

  const loadTags = useCallback(async () => {
    setIsLoadingTags(true);
    try {
      const list = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* polymarket.listTags({ limit: 120 });
        }),
      );
      setTags(list);
    } catch (tagError) {
      setError(extractErrorMessage(tagError));
    } finally {
      setIsLoadingTags(false);
    }
  }, []);

  const loadMarketHistory = useCallback(async (marketId: string, outcome: string) => {
    try {
      const points = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* polymarket.getOutcomeHistory(marketId, outcome);
        }),
      );
      setMarketHistory(points);
    } catch (historyError) {
      setMarketHistory([]);
      setError(extractErrorMessage(historyError));
    }
  }, []);

  const hydrateLeagueAnalytics = useCallback(async (detail: LeagueDetail) => {
    const targetPairs = Array.from(
      new Map(
        detail.positions.map((position) => [marketOutcomeKey(position.marketId, position.outcome), position]),
      ).values(),
    );

    const priceEntries = await runAppEffect(
      Effect.gen(function* () {
        const polymarket = yield* PolymarketClient;
        return yield* Effect.forEach(
          targetPairs,
          (position) =>
            Effect.gen(function* () {
              const maybePrice = yield* Effect.catchAll(
                polymarket.getOutcomePrice(position.marketId, position.outcome),
                () => Effect.succeed<number | null>(null),
              );

              return [marketOutcomeKey(position.marketId, position.outcome), maybePrice] as const;
            }),
          { concurrency: 8 },
        );
      }),
    );

    const priceMap = new Map<string, number>();
    for (const [key, maybePrice] of priceEntries) {
      if (typeof maybePrice === "number" && Number.isFinite(maybePrice)) {
        priceMap.set(key, maybePrice);
      }
    }

    const next = buildLeagueAnalytics(detail, priceMap);
    setStandings(next.standings);
    setPositions(next.positions);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (runtimeConfigError) {
        setError(runtimeConfigError);
        setBooting(false);
        return;
      }

      if (isAuthLoading) {
        setBooting(true);
        return;
      }

      if (!isAuthenticated) {
        setSession(null);
        setBooting(false);
        return;
      }

      setBooting(true);

      try {
        const user = await runAppEffect(
          Effect.gen(function* () {
            const api = yield* FantasyLeagueClient;
            return yield* api.currentUser();
          }),
        );

        if (cancelled) {
          return;
        }

        setSession({ user });
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(extractErrorMessage(bootstrapError));
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (runtimeConfigError || !session) {
      return;
    }
    void loadTags();
  }, [loadTags, session]);

  useEffect(() => {
    if (runtimeConfigError || !session) {
      return;
    }
    void loadMarkets();
  }, [loadMarkets, session]);

  useEffect(() => {
    if (runtimeConfigError || !session) {
      return;
    }
    const handle = setInterval(() => {
      void loadMarkets();
    }, 60_000);

    return () => clearInterval(handle);
  }, [loadMarkets, session]);

  useEffect(() => {
    if (!session || !selectedLeagueId) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      setIsRefreshingLeague(true);
      try {
        const detail = await runAppEffect(
          Effect.gen(function* () {
            const api = yield* FantasyLeagueClient;
            return yield* api.leagueDetail(selectedLeagueId);
          }),
        );
        if (!cancelled) {
          setLeagueDetail(detail);
          await hydrateLeagueAnalytics(detail);
        }
      } catch (liveError) {
        if (!cancelled) {
          setError(extractErrorMessage(liveError));
        }
      } finally {
        if (!cancelled) {
          setIsRefreshingLeague(false);
        }
      }
    };

    void refresh();
    const handle = setInterval(() => {
      void refresh();
    }, 12_000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [hydrateLeagueAnalytics, selectedLeagueId, session]);

  useEffect(() => {
    if (!session) {
      setLeagues([]);
      setSelectedLeagueId(null);
      setLeagueDetail(null);
      setStandings([]);
      setPositions([]);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const leagueList = await runAppEffect(
          Effect.gen(function* () {
            const api = yield* FantasyLeagueClient;
            return yield* api.listLeagues();
          }),
        );
        if (cancelled) {
          return;
        }
        setLeagues(leagueList);
        setSelectedLeagueId((current) => {
          if (current && leagueList.some((league) => league.leagueId === current)) {
            return current;
          }
          return leagueList[0]?.leagueId ?? null;
        });
      } catch (liveError) {
        if (!cancelled) {
          setError(extractErrorMessage(liveError));
        }
      }
    };

    void refresh();
    const handle = setInterval(() => {
      void refresh();
    }, 12_000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [session]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const handle = setTimeout(() => setNotice(null), 5_500);
    return () => clearTimeout(handle);
  }, [notice]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentRoute(window.location.pathname.startsWith("/leagues") ? "leagues" : "desk");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!selectedMarket) {
      setSelectedOutcome(null);
      return;
    }

    setSelectedOutcome((current) => {
      if (current && selectedMarket.outcomes.some((outcome) => outcome.name === current)) {
        return current;
      }
      return selectedMarket.outcomes[0]?.name ?? null;
    });
  }, [selectedMarket]);

  useEffect(() => {
    if (!selectedMarket || !selectedOutcome) {
      if (!selectedMarket) {
        setMarketHistory([]);
      }
      return;
    }
    void loadMarketHistory(selectedMarket.marketId, selectedOutcome);
  }, [loadMarketHistory, selectedMarket, selectedOutcome]);

  const handleSignIn = async () => {
    clearBanner();
    setBusy("signin");
    try {
      await signIn();
    } catch (signInError) {
      setError(extractErrorMessage(signInError));
      setBusy(null);
    }
  };

  const handleSignOut = async () => {
    clearBanner();
    setBusy("signout");

    try {
      await signOut();
      setSession(null);
      setLeagues([]);
      setLeagueDetail(null);
      setStandings([]);
      setPositions([]);
      setSelectedLeagueId(null);
      setIsRefreshingLeague(false);
      setNotice("Signed out.");
    } catch (signOutError) {
      setError(extractErrorMessage(signOutError));
    } finally {
      setBusy(null);
    }
  };

  const handleCreateLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      return;
    }

    clearBanner();
    setBusy("createLeague");

    try {
      const bankroll = Number.parseFloat(createLeagueForm.bankroll);
      const created = await runAppEffect(
        Effect.gen(function* () {
          const api = yield* FantasyLeagueClient;
          return yield* api.createLeague({
            name: createLeagueForm.name,
            startingBankroll: Number.isFinite(bankroll) ? bankroll : undefined,
          });
        }),
      );

      setCreateLeagueForm(defaultCreateLeague);
      setSelectedLeagueId(created.leagueId);
      setNotice("League created.");
    } catch (createError) {
      setError(extractErrorMessage(createError));
    } finally {
      setBusy(null);
    }
  };

  const handleJoinLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      return;
    }

    clearBanner();
    setBusy("joinLeague");

    try {
      const joined = await runAppEffect(
        Effect.gen(function* () {
          const api = yield* FantasyLeagueClient;
          return yield* api.joinLeague({
            code: joinCode,
          });
        }),
      );

      setJoinCode("");
      setSelectedLeagueId(joined.leagueId);
      setNotice(joined.alreadyJoined ? "You were already in this league." : "Joined league.");
    } catch (joinError) {
      setError(extractErrorMessage(joinError));
    } finally {
      setBusy(null);
    }
  };

  const handleSelectLeague = (leagueId: string) => {
    clearBanner();
    setSelectedLeagueId(leagueId);
  };

  const handleOpenSlug = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = slugInput.trim().toLowerCase();
    if (!slug) {
      return;
    }

    clearBanner();
    setIsOpeningSlug(true);
    try {
      const market = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* polymarket.getMarketBySlug(slug);
        }),
      );
      setMarkets((current) => [market, ...current.filter((entry) => entry.marketId !== market.marketId)]);
      setSelectedMarketId(market.marketId);
      setNotice(`Opened market slug: ${market.slug ?? slug}`);
    } catch (slugError) {
      setError(extractErrorMessage(slugError));
    } finally {
      setIsOpeningSlug(false);
    }
  };

  const handlePlaceBet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedLeague || !selectedMarket || !selectedOutcome) {
      setError("Choose a league, market, and outcome first.");
      return;
    }

    clearBanner();
    setBusy("placeBet");

    try {
      const stake = Number.parseFloat(stakeInput);
      if (!Number.isFinite(stake) || stake <= 0) {
        throw new Error("Stake must be a valid number greater than 0.");
      }

      const livePrice = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* polymarket.getOutcomePrice(selectedMarket.marketId, selectedOutcome);
        }),
      );

      if (livePrice === null) {
        throw new Error("Could not fetch a live quote for this outcome.");
      }

      await runAppEffect(
        Effect.gen(function* () {
          const api = yield* FantasyLeagueClient;
          return yield* api.placeBet({
            leagueId: selectedLeague.leagueId,
            marketId: selectedMarket.marketId,
            marketSlug: selectedMarket.slug,
            marketQuestion: selectedMarket.question,
            outcome: selectedOutcome,
            price: livePrice,
            stake,
          });
        }),
      );

      setNotice(
        `Bought ${selectedOutcome} at ${formatPercent(livePrice)} for ${formatCurrency(stake)} in ${selectedLeague.name}.`,
      );
    } catch (betError) {
      setError(extractErrorMessage(betError));
    } finally {
      setBusy(null);
    }
  };

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <p className="eyebrow">Polymarket Fantasy League</p>
          <h1>Loading workspace...</h1>
          <p>Wiring Convex state and live market feeds.</p>
        </div>
      </div>
    );
  }

  if (runtimeConfigError) {
    return (
      <div className="auth-shell">
        <section className="auth-panel glass">
          <p className="eyebrow">Polymockit Setup</p>
          <h1>Frontend env is not configured.</h1>
          <p>
            Set <code>VITE_CONVEX_URL</code> in <code>/Users/david/projects/polymockit/.env.local</code> or{" "}
            <code>/Users/david/projects/polymockit/apps/web/.env</code>, then restart <code>bun run dev</code>.
          </p>
          <div className="banner error">{runtimeConfigError}</div>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
    <div className="auth-shell">
      <section className="auth-panel glass">
        <p className="eyebrow">Polymockit</p>
        <h1>Build your prediction market fantasy league.</h1>
        <p>
          Use fake bankroll, draft from live Polymarket contracts, and compete on portfolio equity inside private
          leagues.
        </p>
        <button type="button" onClick={() => void handleSignIn()} disabled={busy === "signin"}>
          {busy === "signin" ? "Signing in..." : "Sign in with Shoo"}
        </button>

        {error ? <div className="banner error">{error}</div> : null}
      </section>
    </div>
  );
  }

  return (
    <div className="app-shell">
      <header className="topbar glass">
        <div>
          <p className="eyebrow">Polymockit</p>
          <h1>Fantasy Prediction Desk</h1>
        </div>

        <div className="topbar-right">
          <div className="route-switch">
            <button
              type="button"
              className={currentRoute === "desk" ? "" : "secondary"}
              onClick={() => navigateTo("desk")}
            >
              Desk
            </button>
            <button
              type="button"
              className={currentRoute === "leagues" ? "" : "secondary"}
              onClick={() => navigateTo("leagues")}
            >
              League Setup
            </button>
          </div>

          <div className="identity-chip">
            <span className="avatar" style={{ backgroundColor: session.user.accentColor }}>
              {session.user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{session.user.displayName}</strong>
              <small>@{session.user.username}</small>
            </div>
          </div>

          <button type="button" className="secondary" onClick={() => void handleSignOut()} disabled={busy === "signout"}>
            {busy === "signout" ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      {error ? <div className="banner error">{error}</div> : null}
      {notice ? <div className="banner notice">{notice}</div> : null}

      {currentRoute === "leagues" ? (
        <main className="route-shell">
          <section className="panel glass league-admin-panel">
            <div className="panel-head">
              <div>
                <h2>League Setup</h2>
                <p className="muted">Create new leagues or join with invite code.</p>
              </div>
              <button type="button" className="secondary" onClick={() => navigateTo("desk")}>
                Back to desk
              </button>
            </div>
            <div className="league-admin-grid">
              <section>
                <h3>Create League</h3>
                <form className="stack compact" onSubmit={handleCreateLeague}>
                  <input
                    required
                    value={createLeagueForm.name}
                    onChange={(event) =>
                      setCreateLeagueForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="League name"
                  />
                  <input
                    required
                    type="number"
                    min={100}
                    step={100}
                    value={createLeagueForm.bankroll}
                    onChange={(event) =>
                      setCreateLeagueForm((current) => ({
                        ...current,
                        bankroll: event.target.value,
                      }))
                    }
                    placeholder="Starting bankroll"
                  />
                  <button type="submit" disabled={busy === "createLeague"}>
                    {busy === "createLeague" ? "Creating..." : "Create"}
                  </button>
                </form>
              </section>

              <section>
                <h3>Join League</h3>
                <form className="stack compact" onSubmit={handleJoinLeague}>
                  <input
                    required
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="Invite code"
                  />
                  <button type="submit" disabled={busy === "joinLeague"}>
                    {busy === "joinLeague" ? "Joining..." : "Join"}
                  </button>
                </form>
              </section>

              <section>
                <h3>Your Leagues</h3>
                <div className="league-list">
                  {leagues.length === 0 ? <p className="muted">No leagues yet. Create one to start.</p> : null}
                  {leagues.map((league) => (
                    <button
                      type="button"
                      key={league.leagueId}
                      className={`league-item ${league.leagueId === selectedLeagueId ? "active" : ""}`}
                      onClick={() => {
                        handleSelectLeague(league.leagueId);
                        navigateTo("desk");
                      }}
                    >
                      <div>
                        <strong>{league.name}</strong>
                        <small>Code {league.code}</small>
                      </div>
                      <div className="league-meta">
                        <span>{league.memberCount} players</span>
                        <span>{formatCurrency(league.myCash)} cash</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </main>
      ) : (
        <main className="layout-grid">
          <section className="panel glass markets-panel">
            <div className="panel-head">
              <div>
                <h2>Polymarket Feed</h2>
                <p className="muted">Browse markets by feed, slug, and tags.</p>
              </div>
              <span className="status-pill">
                {isRefreshingMarkets ? "Refreshing" : `${Math.min(markets.length, MAX_MARKET_ROWS)} shown`}
              </span>
            </div>

            <div className="market-controls-row">
              <div className="toggle-row">
                <button
                  type="button"
                  className={feedMode === "trending" ? "" : "secondary"}
                  onClick={() => {
                    setFeedMode("trending");
                    void loadMarkets({ mode: "trending" });
                  }}
                >
                  Trending
                </button>
                <button
                  type="button"
                  className={feedMode === "recent" ? "" : "secondary"}
                  onClick={() => {
                    setFeedMode("recent");
                    void loadMarkets({ mode: "recent" });
                  }}
                >
                  Recent
                </button>
              </div>

              <form className="slug-inline" onSubmit={handleOpenSlug}>
                <input
                  value={slugInput}
                  onChange={(event) => setSlugInput(event.target.value)}
                  placeholder="Open by slug..."
                  aria-label="Open market by slug"
                />
                <button type="submit" disabled={isOpeningSlug || !slugInput.trim()}>
                  {isOpeningSlug ? "..." : "Open"}
                </button>
              </form>

              <div className="tag-filter-inline">
                <input
                  value={tagSearch}
                  onChange={(event) => setTagSearch(event.target.value)}
                  placeholder="Filter tags..."
                  aria-label="Filter tags"
                />
                {selectedTagSlug ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSelectedTagSlug(null);
                      void loadMarkets({ tagSlug: null });
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="tag-list single-row">
              {isLoadingTags ? <span className="muted">Loading tags...</span> : null}
              {!isLoadingTags &&
                visibleTags.slice(0, 40).map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    className={`tag-chip ${selectedTagSlug === tag.slug ? "active" : ""}`}
                    onClick={() => {
                      setSelectedTagSlug(tag.slug);
                      void loadMarkets({ tagSlug: tag.slug });
                    }}
                    title={tag.slug}
                  >
                    {tag.label}
                  </button>
                ))}
            </div>

            <div className="market-grid">
              {markets.slice(0, MAX_MARKET_ROWS).map((market) => (
                <button
                  type="button"
                  key={market.marketId}
                  className={`market-card ${market.marketId === selectedMarketId ? "active" : ""}`}
                  onClick={() => setSelectedMarketId(market.marketId)}
                >
                  <h3>{shortMarket(market.question)}</h3>
                  <div className="market-outcomes">
                    {market.outcomes.map((outcome) => (
                      <span key={`${market.marketId}-${outcome.name}`}>
                        {outcome.name}: {formatPercent(outcome.price)}
                      </span>
                    ))}
                  </div>
                  <div className="market-stats">
                    <span>Vol {formatCurrency(market.volume)}</span>
                    <span>Liquidity {formatCurrency(market.liquidity)}</span>
                  </div>
                </button>
              ))}
              {markets.length > MAX_MARKET_ROWS ? (
                <p className="muted">Showing {MAX_MARKET_ROWS} of {markets.length} markets.</p>
              ) : null}
            </div>
          </section>

          <aside className="panel glass league-panel">
            <section className="market-history side-history">
              <div className="market-history-head">
                <h3>Market History</h3>
                {selectedOutcome ? <span className="status-pill">{selectedOutcome}</span> : null}
              </div>
              {selectedMarket ? <p className="muted">{shortMarket(selectedMarket.question)}</p> : null}
              <div className="history-frame">
                <PriceHistoryChart points={marketHistory} />
              </div>
              <div className="history-stats">
                <span>Latest {historyStats ? formatPercent(historyStats.latest) : "--"}</span>
                <span>Low {historyStats ? formatPercent(historyStats.low) : "--"}</span>
                <span>High {historyStats ? formatPercent(historyStats.high) : "--"}</span>
              </div>
            </section>

          {selectedLeague && leagueDetail ? (
            <>
              <div className="panel-head">
                <div>
                  <h2>{selectedLeague.name}</h2>
                  <p className="muted">Invite code {leagueDetail.league.code}</p>
                </div>
                <span className="status-pill">{isRefreshingLeague ? "Syncing" : "Live"}</span>
              </div>

              <section>
                <h3>Leaderboard</h3>
                <div className="leaderboard">
                  {standings.slice(0, MAX_LEADERBOARD_ROWS).map((entry, index) => (
                    <div key={entry.userId} className="leader-row">
                      <div>
                        <strong>
                          #{index + 1} {entry.displayName}
                        </strong>
                        <small>@{entry.username}</small>
                      </div>
                      <div className="leader-metrics">
                        <span>{formatCurrency(entry.equity)} equity</span>
                        <span className={entry.pnl >= 0 ? "pos" : "neg"}>
                          {entry.pnl >= 0 ? "+" : ""}
                          {formatCurrency(entry.pnl)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {standings.length > MAX_LEADERBOARD_ROWS ? (
                    <p className="muted">Showing top {MAX_LEADERBOARD_ROWS} of {standings.length} members.</p>
                  ) : null}
                </div>
              </section>

              <section>
                <h3>Place Fantasy Bet</h3>
                <form className="stack compact" onSubmit={handlePlaceBet}>
                  <label>
                    Market
                    <input value={selectedMarket?.question ?? "Choose a market on the left"} readOnly />
                  </label>

                  <label>
                    Outcome
                    <select value={selectedOutcome ?? ""} onChange={(event) => setSelectedOutcome(event.target.value)}>
                      {(selectedMarket?.outcomes ?? []).map((outcome) => (
                        <option value={outcome.name} key={`${selectedMarket?.marketId}-${outcome.name}`}>
                          {outcome.name} ({formatPercent(outcome.price)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Stake
                    <input
                      required
                      type="number"
                      min={1}
                      step={1}
                      value={stakeInput}
                      onChange={(event) => setStakeInput(event.target.value)}
                    />
                  </label>

                  <button type="submit" disabled={busy === "placeBet"}>
                    {busy === "placeBet" ? "Submitting..." : "Buy Position"}
                  </button>
                </form>
              </section>

              <section>
                <h3>Open Positions</h3>
                <div className="positions-list">
                  {positions.length === 0 ? <p className="muted">No positions yet.</p> : null}
                  {positions.slice(0, MAX_POSITIONS_ROWS).map((position) => (
                    <div key={position._id} className="position-row">
                      <div>
                        <strong>{shortMarket(position.marketQuestion)}</strong>
                        <small>
                          {position.outcome} | {position.shares.toFixed(2)} shares
                        </small>
                      </div>
                      <div className="position-metrics">
                        <span>{formatCurrency(position.currentValue)}</span>
                        <span className={position.unrealizedPnl >= 0 ? "pos" : "neg"}>
                          {position.unrealizedPnl >= 0 ? "+" : ""}
                          {formatCurrency(position.unrealizedPnl)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {positions.length > MAX_POSITIONS_ROWS ? (
                    <p className="muted">Showing {MAX_POSITIONS_ROWS} of {positions.length} positions.</p>
                  ) : null}
                </div>
              </section>

              <section>
                <h3>Recent Bets</h3>
                <div className="positions-list">
                  {leagueDetail.recentBets.slice(0, MAX_RECENT_BETS_ROWS).map((bet) => (
                    <div key={bet._id} className="position-row">
                      <div>
                        <strong>{shortMarket(bet.marketQuestion)}</strong>
                        <small>
                          {bet.displayName} bought {bet.outcome} at {formatPercent(bet.price)}
                        </small>
                      </div>
                      <div className="position-metrics">
                        <span>{formatCurrency(bet.stake)}</span>
                        <small>{formatDateTime(bet.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                  {leagueDetail.recentBets.length > MAX_RECENT_BETS_ROWS ? (
                    <p className="muted">
                      Showing {MAX_RECENT_BETS_ROWS} of {leagueDetail.recentBets.length} recent bets.
                    </p>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state">
              <h2>No league selected</h2>
              <p>Create or join a league to start placing fantasy positions.</p>
            </div>
          )}
          </aside>
        </main>
      )}
    </div>
  );
}
