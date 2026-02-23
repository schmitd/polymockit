import { describe, expect, it } from "bun:test";
import { currency, quantity } from "./league";
import { settleShareSale } from "./positions";

describe("settleShareSale", () => {
  it("realizes returns only when selling and blocks repeat cash-out", () => {
    const startingCash = 100;
    const stake = 100;
    const entryPrice = 0.5;
    const exitPrice = 0.9;

    const shares = quantity(stake / entryPrice);
    const cashAfterBuy = currency(startingCash - stake);

    expect(cashAfterBuy).toBe(0);
    expect(currency(shares * exitPrice)).toBe(180);

    const exit = settleShareSale({
      shares,
      totalCost: stake,
      sharesToSell: shares,
      price: exitPrice,
    });

    const cashAfterSell = currency(cashAfterBuy + exit.payout);
    expect(cashAfterSell).toBe(180);
    expect(exit.realizedPnl).toBe(80);
    expect(exit.remainingShares).toBe(0);

    expect(() =>
      settleShareSale({
        shares: exit.remainingShares,
        totalCost: exit.remainingCost,
        sharesToSell: 1,
        price: exitPrice,
      }),
    ).toThrow("No shares available to cash out.");
  });
});
