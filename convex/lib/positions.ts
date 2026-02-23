import { currency, quantity } from "./league";

export interface ShareSaleInput {
  shares: number;
  totalCost: number;
  sharesToSell: number;
  price: number;
}

export interface ShareSaleResult {
  sharesSold: number;
  costBasisSold: number;
  payout: number;
  realizedPnl: number;
  remainingShares: number;
  remainingCost: number;
}

export function settleShareSale(input: ShareSaleInput): ShareSaleResult {
  const shares = quantity(input.shares);
  const sharesToSell = quantity(input.sharesToSell);
  const totalCost = currency(input.totalCost);
  const price = input.price;

  if (!Number.isFinite(shares) || shares <= 0) {
    throw new Error("No shares available to cash out.");
  }

  if (!Number.isFinite(sharesToSell) || sharesToSell <= 0) {
    throw new Error("Shares to sell must be greater than 0.");
  }

  if (sharesToSell > shares) {
    throw new Error("Cannot sell more shares than held.");
  }

  if (!Number.isFinite(totalCost) || totalCost < 0) {
    throw new Error("Position cost basis is invalid.");
  }

  if (!Number.isFinite(price) || price < 0 || price > 1) {
    throw new Error("Sale price must be between 0 and 1.");
  }

  const soldShareRatio = sharesToSell / shares;
  const costBasisSold = currency(totalCost * soldShareRatio);
  const payout = currency(sharesToSell * price);
  const rawRemainingShares = quantity(shares - sharesToSell);
  const remainingShares = rawRemainingShares <= 0 ? 0 : rawRemainingShares;
  const remainingCost = remainingShares === 0 ? 0 : currency(totalCost - costBasisSold);
  const realizedPnl = currency(payout - costBasisSold);

  return {
    sharesSold: sharesToSell,
    costBasisSold,
    payout,
    realizedPnl,
    remainingShares,
    remainingCost,
  };
}
