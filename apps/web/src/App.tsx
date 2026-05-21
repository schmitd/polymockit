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
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RuntimeConfigErrorPanel } from "./components/AuthScreens";
import { DashboardHeader } from "./components/DashboardHeader";
import { LeagueSetupView } from "./components/LeagueSetupView";
import { LeagueSidebar } from "./components/LeagueSidebar";
import { MarketFeedPanel } from "./components/MarketFeedPanel";
import { buttonPrimaryClass } from "./components/ui";
import { getRuntimeConfigError, runAppEffect } from "./effect/runtime";
import { buildLeagueAnalytics, formatCurrency, formatPercent, marketOutcomeKey } from "./lib/analytics";
import { signIn, signOut } from "./shoo";

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

function SessionOverlay({
  error,
  isAuthLoading,
  isSigningIn,
  onSignIn,
}: {
  error: string | null;
  isAuthLoading: boolean;
  isSigningIn: boolean;
  onSignIn: () => void;
}) {
  const isBusy = isAuthLoading || isSigningIn;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center p-3 sm:p-6">
      <section className="panel pointer-events-auto mt-16 flex w-full max-w-[32rem] flex-col gap-3 p-6">
        <p className="eyebrow">Polymockit</p>
        <h2 className="title">
          {isAuthLoading ? "Checking your session." : "Sign in to open the trading desk."}
        </h2>
        <p className="m-0 text-[var(--muted)]">
          {isAuthLoading
            ? "The app shell is already loaded. Live league and market data will attach once auth resolves."
            : "Browse the layout immediately, then authenticate when you are ready to load leagues and live market data."}
        </p>
        {!isAuthLoading ? (
          <button
            type="button"
            className={`${buttonPrimaryClass} w-fit`}
            onClick={onSignIn}
            disabled={isBusy}
          >
            {isSigningIn ? "Signing in..." : "Sign in with Shoo"}
          </button>
        ) : null}
        {error ? (
          <div className="banner banner-danger">{error}</div>
        ) : null}
      </section>
    </div>
  );
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error. Please try again.";
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
  const knownMarketIdsRef = useRef<Set<string>>(new Set());

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.leagueId === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId],
  );

  const selectedMarket = useMemo(
    () => markets.find((market) => market.marketId === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );
  const myPositions = useMemo(() => {
    if (!leagueDetail) {
      return [];
    }
    return positions.filter((position) => position.userId === leagueDetail.viewer.userId);
  }, [leagueDetail, positions]);
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
    return tags.filter((tag) => {
      const normalizedSlug = tag.slug.trim().toLowerCase();
      if (!needle) {
        return true;
      }
      return tag.label.toLowerCase().includes(needle) || normalizedSlug.includes(needle);
    });
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

  const hydrateLeagueMarkets = useCallback(
    async (detail: LeagueDetail) => {
      const marketIdsInLeague = Array.from(new Set(detail.positions.map((position) => position.marketId)));
      const missingMarketIds = marketIdsInLeague.filter((marketId) => !knownMarketIdsRef.current.has(marketId));
      if (missingMarketIds.length === 0) {
        return;
      }

      const fetched = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* Effect.forEach(
            missingMarketIds,
            (marketId) =>
              Effect.catchAll(
                polymarket.getMarket(marketId),
                () => Effect.succeed<PolymarketMarket | null>(null),
              ),
            { concurrency: 4 },
          );
        }),
      );

      const additions = fetched.filter((entry): entry is PolymarketMarket => entry !== null);
      if (additions.length === 0) {
        return;
      }

      setMarkets((current) => {
        const byId = new Map(current.map((market) => [market.marketId, market]));
        additions.forEach((market) => {
          if (!byId.has(market.marketId)) {
            byId.set(market.marketId, market);
          }
        });
        return Array.from(byId.values());
      });
    },
    [],
  );

  useEffect(() => {
    knownMarketIdsRef.current = new Set(markets.map((market) => market.marketId));
  }, [markets]);

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
          await Promise.all([hydrateLeagueAnalytics(detail), hydrateLeagueMarkets(detail)]);
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
  }, [hydrateLeagueAnalytics, hydrateLeagueMarkets, selectedLeagueId, session]);

  useEffect(() => {
    if (!leagueDetail) {
      return;
    }
    let cancelled = false;

    const refreshQuotes = async () => {
      try {
        await hydrateLeagueAnalytics(leagueDetail);
      } catch (quoteError) {
        if (!cancelled) {
          setError(extractErrorMessage(quoteError));
        }
      }
    };

    const handle = setInterval(() => {
      void refreshQuotes();
    }, 8_000);

    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [hydrateLeagueAnalytics, leagueDetail]);

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

  const handleSelectLeague = useCallback(
    (leagueId: string) => {
      clearBanner();
      setSelectedLeagueId(leagueId);
    },
    [clearBanner],
  );

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

  const handleCashOutPosition = async (position: EnrichedPosition) => {
    if (!selectedLeague) {
      setError("Choose a league first.");
      return;
    }

    clearBanner();
    const busyToken = `cashOut:${position._id}`;
    setBusy(busyToken);

    try {
      const livePrice = await runAppEffect(
        Effect.gen(function* () {
          const polymarket = yield* PolymarketClient;
          return yield* polymarket.getOutcomePrice(position.marketId, position.outcome);
        }),
      );

      if (livePrice === null) {
        throw new Error("Could not fetch a live quote for this position.");
      }

      const sold = await runAppEffect(
        Effect.gen(function* () {
          const api = yield* FantasyLeagueClient;
          return yield* api.cashOutPosition({
            leagueId: selectedLeague.leagueId,
            positionId: position._id,
            price: livePrice,
          });
        }),
      );

      const detail = await runAppEffect(
        Effect.gen(function* () {
          const api = yield* FantasyLeagueClient;
          return yield* api.leagueDetail(selectedLeague.leagueId);
        }),
      );

      setLeagueDetail(detail);
      await Promise.all([hydrateLeagueAnalytics(detail), hydrateLeagueMarkets(detail)]);
      setNotice(
        `Cashed out ${position.outcome} for ${formatCurrency(sold.payout)} (${sold.realizedPnl >= 0 ? "+" : ""}${formatCurrency(sold.realizedPnl)}).`,
      );
    } catch (cashOutError) {
      setError(extractErrorMessage(cashOutError));
    } finally {
      setBusy(null);
    }
  };

  const handleFeedModeChange = useCallback(
    (mode: "trending" | "recent") => {
      setFeedMode(mode);
      void loadMarkets({ mode });
    },
    [loadMarkets],
  );

  const handleTagSelection = useCallback(
    (tagSlug: string | null) => {
      setSelectedTagSlug(tagSlug);
      void loadMarkets({ tagSlug });
    },
    [loadMarkets],
  );

  const handleOpenLeagueFromSetup = useCallback(
    (leagueId: string) => {
      handleSelectLeague(leagueId);
      navigateTo("desk");
    },
    [handleSelectLeague, navigateTo],
  );

  if (runtimeConfigError) {
    return <RuntimeConfigErrorPanel runtimeConfigError={runtimeConfigError} />;
  }

  const showSessionOverlay = !session;
  const shellMuted = showSessionOverlay ? "pointer-events-none select-none opacity-45" : "";

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <DashboardHeader
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        user={session?.user ?? null}
        isAuthLoading={isAuthLoading || booting}
        isSigningIn={busy === "signin"}
        isSigningOut={busy === "signout"}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
      />

      {error && session ? (
        <div className="banner banner-danger mx-3 mt-2 sm:mx-6">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="banner banner-notice mx-3 mt-2 sm:mx-6">
          {notice}
        </div>
      ) : null}

      <div className="flex-1">
        {currentRoute === "leagues" ? (
          <div className="relative">
            <div className={shellMuted}>
              <LeagueSetupView
                createLeagueForm={createLeagueForm}
                onCreateLeagueNameChange={(name) =>
                  setCreateLeagueForm((current) => ({
                    ...current,
                    name,
                  }))
                }
                onCreateLeagueBankrollChange={(bankroll) =>
                  setCreateLeagueForm((current) => ({
                    ...current,
                    bankroll,
                  }))
                }
                onCreateLeague={handleCreateLeague}
                isCreatingLeague={busy === "createLeague"}
                joinCode={joinCode}
                onJoinCodeChange={setJoinCode}
                onJoinLeague={handleJoinLeague}
                isJoiningLeague={busy === "joinLeague"}
                leagues={leagues}
                selectedLeagueId={selectedLeagueId}
                onOpenLeague={handleOpenLeagueFromSetup}
                onBackToDesk={() => navigateTo("desk")}
              />
            </div>
            {showSessionOverlay ? (
              <SessionOverlay
                error={error}
                isAuthLoading={isAuthLoading || booting}
                isSigningIn={busy === "signin"}
                onSignIn={() => void handleSignIn()}
              />
            ) : null}
          </div>
        ) : (
          <main className="relative">
            <div className={`grid grid-cols-1 gap-3 p-3 sm:p-6 xl:grid-cols-[1.45fr_1fr] ${shellMuted}`}>
              <MarketFeedPanel
                feedMode={feedMode}
                onFeedModeChange={handleFeedModeChange}
                isRefreshingMarkets={isRefreshingMarkets}
                markets={markets}
                maxMarketRows={MAX_MARKET_ROWS}
                selectedMarketId={selectedMarketId}
                onSelectMarket={(marketId) => setSelectedMarketId(marketId)}
                tagSearch={tagSearch}
                onTagSearchChange={setTagSearch}
                selectedTagSlug={selectedTagSlug}
                onSelectTag={handleTagSelection}
                isLoadingTags={isLoadingTags}
                visibleTags={visibleTags}
              />
              <LeagueSidebar
                selectedLeague={selectedLeague}
                leagueDetail={leagueDetail}
                selectedMarket={selectedMarket}
                selectedOutcome={selectedOutcome}
                onSelectedOutcomeChange={(outcome) => setSelectedOutcome(outcome)}
                marketHistory={marketHistory}
                historyStats={historyStats}
                isRefreshingLeague={isRefreshingLeague}
                standings={standings}
                maxLeaderboardRows={MAX_LEADERBOARD_ROWS}
                slugInput={slugInput}
                onSlugInputChange={setSlugInput}
                isOpeningSlug={isOpeningSlug}
                onOpenSlug={handleOpenSlug}
                stakeInput={stakeInput}
                onStakeInputChange={setStakeInput}
                onPlaceBet={handlePlaceBet}
                busy={busy}
                myPositions={myPositions}
                maxPositionsRows={MAX_POSITIONS_ROWS}
                onCashOutPosition={(position) => void handleCashOutPosition(position)}
                maxRecentBetsRows={MAX_RECENT_BETS_ROWS}
              />
            </div>
            {showSessionOverlay ? (
              <SessionOverlay
                error={error}
                isAuthLoading={isAuthLoading || booting}
                isSigningIn={busy === "signin"}
                onSignIn={() => void handleSignIn()}
              />
            ) : null}
          </main>
        )}
      </div>
    </div>
  );
}
