import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuthUser } from "./lib/auth";
import { currency, makeInviteCode, quantity, requireLeagueMember } from "./lib/league";
import { settleShareSale } from "./lib/positions";

async function uniqueLeagueCode(ctx: any): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const code = makeInviteCode();
    const existing = await ctx.db.query("leagues").withIndex("by_code", (q: any) => q.eq("code", code)).first();
    if (!existing) {
      return code;
    }
  }
  throw new ConvexError("Unable to generate a unique league code. Try again.");
}

export const createLeague = mutation({
  args: {
    name: v.string(),
    startingBankroll: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const trimmedName = args.name.trim().slice(0, 60);
    if (trimmedName.length < 3) {
      throw new ConvexError("League name must be at least 3 characters.");
    }

    const startingBankroll = currency(args.startingBankroll ?? 10_000);
    if (startingBankroll < 100 || startingBankroll > 1_000_000) {
      throw new ConvexError("Starting bankroll must be between 100 and 1,000,000.");
    }

    const now = Date.now();
    const code = await uniqueLeagueCode(ctx);

    const leagueId = await ctx.db.insert("leagues", {
      name: trimmedName,
      code,
      ownerId: user._id,
      startingBankroll,
      createdAt: now,
    });

    await ctx.db.insert("leagueMembers", {
      leagueId,
      userId: user._id,
      cash: startingBankroll,
      joinedAt: now,
    });

    return {
      leagueId,
      code,
      name: trimmedName,
      startingBankroll,
    };
  },
});

export const joinLeague = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const code = args.code.trim().toUpperCase();

    const league = await ctx.db.query("leagues").withIndex("by_code", (q: any) => q.eq("code", code)).first();
    if (!league) {
      throw new ConvexError("League code not found.");
    }

    const existingMembership = await ctx.db
      .query("leagueMembers")
      .withIndex("by_league_user", (q: any) => q.eq("leagueId", league._id).eq("userId", user._id))
      .first();

    if (existingMembership) {
      return {
        leagueId: league._id,
        alreadyJoined: true,
      };
    }

    await ctx.db.insert("leagueMembers", {
      leagueId: league._id,
      userId: user._id,
      cash: league.startingBankroll,
      joinedAt: Date.now(),
    });

    return {
      leagueId: league._id,
      alreadyJoined: false,
    };
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    const memberships = await ctx.db
      .query("leagueMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const leagues = await Promise.all(
      memberships.map(async (membership) => {
        const league = await ctx.db.get(membership.leagueId);
        if (!league) {
          return null;
        }
        const members = await ctx.db
          .query("leagueMembers")
          .withIndex("by_league", (q: any) => q.eq("leagueId", league._id))
          .collect();

        return {
          leagueId: league._id,
          name: league.name,
          code: league.code,
          memberCount: members.length,
          myCash: membership.cash,
          startingBankroll: league.startingBankroll,
          createdAt: league.createdAt,
        };
      }),
    );

    return leagues.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  },
});

export const detail = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const league = await ctx.db.get(args.leagueId);

    if (!league) {
      throw new ConvexError("League not found.");
    }

    const viewerMembership = await requireLeagueMember(ctx, league._id, user._id);

    const members = await ctx.db
      .query("leagueMembers")
      .withIndex("by_league", (q: any) => q.eq("leagueId", league._id))
      .collect();
    const positions = await ctx.db.query("positions").withIndex("by_league", (q: any) => q.eq("leagueId", league._id)).collect();

    const recentBets = await ctx.db
      .query("bets")
      .withIndex("by_league_created", (q: any) => q.eq("leagueId", league._id))
      .order("desc")
      .take(25);

    const userIds = new Set<Id<"users">>();
    members.forEach((member) => userIds.add(member.userId));

    const users = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((doc) => [doc!._id, doc!]));

    const memberRows = members.map((member) => {
      const memberPositions = positions.filter((position) => position.userId === member.userId);
      const invested = memberPositions.reduce((sum, position) => sum + position.totalCost, 0);
      const display = userMap.get(member.userId);

      return {
        memberId: member._id,
        userId: member.userId,
        displayName: display?.displayName ?? "Unknown",
        username: display?.username ?? "unknown",
        accentColor: display?.accentColor ?? "#0A9396",
        cash: member.cash,
        invested: currency(invested),
        joinedAt: member.joinedAt,
      };
    });

    return {
      league: {
        leagueId: league._id,
        name: league.name,
        code: league.code,
        startingBankroll: league.startingBankroll,
        createdAt: league.createdAt,
      },
      viewer: {
        userId: user._id,
        cash: viewerMembership.cash,
      },
      members: memberRows,
      positions,
      recentBets: recentBets.map((bet) => {
        const bettor = userMap.get(bet.userId);
        return {
          ...bet,
          displayName: bettor?.displayName ?? "Unknown",
          username: bettor?.username ?? "unknown",
        };
      }),
    };
  },
});

export const placeBet = mutation({
  args: {
    leagueId: v.id("leagues"),
    marketId: v.string(),
    marketSlug: v.optional(v.string()),
    marketQuestion: v.string(),
    outcome: v.string(),
    price: v.number(),
    stake: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const league = await ctx.db.get(args.leagueId);

    if (!league) {
      throw new ConvexError("League not found.");
    }

    const membership = await requireLeagueMember(ctx, league._id, user._id);

    const marketId = args.marketId.trim();
    const marketQuestion = args.marketQuestion.trim();
    const outcome = args.outcome.trim();

    if (!marketId || !marketQuestion || !outcome) {
      throw new ConvexError("Market, question, and outcome are required.");
    }

    if (!Number.isFinite(args.price) || args.price <= 0 || args.price > 1) {
      throw new ConvexError("Price must be between 0 and 1.");
    }

    const stake = currency(args.stake);
    if (!Number.isFinite(stake) || stake < 1) {
      throw new ConvexError("Stake must be at least $1.00.");
    }

    if (stake > membership.cash) {
      throw new ConvexError("Not enough cash in your league bankroll.");
    }

    const shares = quantity(stake / args.price);
    const now = Date.now();

    await ctx.db.patch(membership._id, {
      cash: currency(membership.cash - stake),
    });

    await ctx.db.insert("bets", {
      leagueId: league._id,
      userId: user._id,
      marketId,
      marketSlug: args.marketSlug,
      marketQuestion,
      side: "buy",
      outcome,
      price: args.price,
      stake,
      shares,
      createdAt: now,
    });

    const existingPosition = await ctx.db
      .query("positions")
      .withIndex("by_member_market_outcome", (q: any) =>
        q.eq("leagueId", league._id).eq("userId", user._id).eq("marketId", marketId).eq("outcome", outcome),
      )
      .first();

    if (!existingPosition) {
      await ctx.db.insert("positions", {
        leagueId: league._id,
        userId: user._id,
        marketId,
        marketSlug: args.marketSlug,
        marketQuestion,
        outcome,
        shares,
        totalCost: stake,
        averagePrice: args.price,
        lastPrice: args.price,
        updatedAt: now,
      });
    } else {
      const totalCost = currency(existingPosition.totalCost + stake);
      const totalShares = quantity(existingPosition.shares + shares);
      const averagePrice = quantity(totalCost / totalShares);

      await ctx.db.patch(existingPosition._id, {
        shares: totalShares,
        totalCost,
        averagePrice,
        lastPrice: args.price,
        updatedAt: now,
      });
    }

    return {
      ok: true,
      shares,
      remainingCash: currency(membership.cash - stake),
    };
  },
});

export const cashOutPosition = mutation({
  args: {
    leagueId: v.id("leagues"),
    positionId: v.id("positions"),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const league = await ctx.db.get(args.leagueId);

    if (!league) {
      throw new ConvexError("League not found.");
    }

    const membership = await requireLeagueMember(ctx, league._id, user._id);
    const position = await ctx.db.get(args.positionId);

    if (!position || position.leagueId !== league._id || position.userId !== user._id) {
      throw new ConvexError("Position not found.");
    }

    if (!Number.isFinite(args.price) || args.price < 0 || args.price > 1) {
      throw new ConvexError("Price must be between 0 and 1.");
    }

    let sale: ReturnType<typeof settleShareSale>;
    try {
      sale = settleShareSale({
        shares: position.shares,
        totalCost: position.totalCost,
        sharesToSell: position.shares,
        price: args.price,
      });
    } catch (saleError) {
      if (saleError instanceof Error) {
        throw new ConvexError(saleError.message);
      }
      throw new ConvexError("Unable to cash out this position.");
    }

    const now = Date.now();
    const remainingCash = currency(membership.cash + sale.payout);

    await ctx.db.patch(membership._id, {
      cash: remainingCash,
    });

    if (sale.remainingShares === 0) {
      await ctx.db.delete(position._id);
    } else {
      await ctx.db.patch(position._id, {
        shares: sale.remainingShares,
        totalCost: sale.remainingCost,
        averagePrice: sale.remainingShares === 0 ? 0 : quantity(sale.remainingCost / sale.remainingShares),
        lastPrice: args.price,
        updatedAt: now,
      });
    }

    await ctx.db.insert("bets", {
      leagueId: league._id,
      userId: user._id,
      marketId: position.marketId,
      marketSlug: position.marketSlug,
      marketQuestion: position.marketQuestion,
      side: "sell",
      outcome: position.outcome,
      price: args.price,
      stake: sale.payout,
      shares: sale.sharesSold,
      createdAt: now,
    });

    return {
      ok: true,
      payout: sale.payout,
      realizedPnl: sale.realizedPnl,
      remainingCash,
    };
  },
});
