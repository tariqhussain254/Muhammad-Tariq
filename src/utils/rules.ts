import { BuildingRecipe, FactionId, MarketCommodity, WeatherType } from '../types/game';

/**
 * Pure deterministic game rules & calculations
 */

export const LEVEL_BASE_XP = 100;
export const LEVEL_EXPONENT = 1.35;

export function getXpForLevel(level: number): number {
  return Math.floor(LEVEL_BASE_XP * Math.pow(level, LEVEL_EXPONENT));
}

export function calculateLevelFromXp(totalXp: number): { level: number; currentXp: number; maxXp: number } {
  let level = 1;
  let remainingXp = totalXp;
  
  while (true) {
    const needed = getXpForLevel(level);
    if (remainingXp < needed) {
      return { level, currentXp: remainingXp, maxXp: needed };
    }
    remainingXp -= needed;
    level++;
  }
}

export function calculateHarvestYield(
  baseAmount: number,
  toolMultiplier: number = 1.0,
  perkBonus: number = 0
): number {
  const scaled = Math.round(baseAmount * toolMultiplier * (1 + perkBonus));
  return Math.max(1, scaled);
}

export function canAffordBuilding(
  costs: BuildingRecipe['costs'],
  inventory: { [resourceKey: string]: number }
): boolean {
  for (const [key, amount] of Object.entries(costs)) {
    if (!amount) continue;
    const current = inventory[key] || 0;
    if (current < amount) return false;
  }
  return true;
}

export function deductBuildingCosts(
  costs: BuildingRecipe['costs'],
  inventory: { [resourceKey: string]: number }
): { [resourceKey: string]: number } {
  const updated = { ...inventory };
  for (const [key, amount] of Object.entries(costs)) {
    if (!amount) continue;
    updated[key] = Math.max(0, (updated[key] || 0) - amount);
  }
  return updated;
}

export function simulateMarketTick(
  commodity: MarketCommodity,
  randomDeltaFactor: number = (Math.random() - 0.49)
): MarketCommodity {
  const volatilityMultiplier = 
    commodity.volatility === 'extreme' ? 0.08 :
    commodity.volatility === 'high' ? 0.045 :
    commodity.volatility === 'moderate' ? 0.025 : 0.012;

  const delta = commodity.currentPrice * randomDeltaFactor * volatilityMultiplier;
  const newPrice = Math.max(1, Math.round((commodity.currentPrice + delta) * 100) / 100);
  const change24h = Math.round(((newPrice - commodity.prevPrice) / commodity.prevPrice) * 1000) / 10;
  
  const history = [...commodity.priceHistory.slice(1), newPrice];
  const high24h = Math.max(...history, commodity.high24h);
  const low24h = Math.min(...history, commodity.low24h);

  return {
    ...commodity,
    currentPrice: newPrice,
    change24h,
    high24h,
    low24h,
    priceHistory: history,
    volume: Math.round(commodity.volume + Math.abs(delta) * 10 + 2),
  };
}

export function calculateTradeOrder(
  price: number,
  quantity: number,
  feeRate: number = 0.015
): { totalCost: number; fee: number; netTotal: number } {
  const subtotal = price * quantity;
  const fee = Math.round(subtotal * feeRate * 100) / 100;
  return {
    totalCost: Math.round(subtotal * 100) / 100,
    fee,
    netTotal: Math.round((subtotal + fee) * 100) / 100,
  };
}

export function calculateFactionDominance(
  scores: Record<FactionId, number>
): { dominantFaction: FactionId; percentages: Record<FactionId, number> } {
  const total = Math.max(1, (scores.vanguard || 0) + (scores.solaris || 0) + (scores.void || 0));
  const percentages: Record<FactionId, number> = {
    vanguard: Math.round(((scores.vanguard || 0) / total) * 100),
    solaris: Math.round(((scores.solaris || 0) / total) * 100),
    void: Math.round(((scores.void || 0) / total) * 100),
  };

  let dominant: FactionId = 'vanguard';
  let highest = -1;
  for (const [fId, score] of Object.entries(scores)) {
    if (score > highest) {
      highest = score;
      dominant = fId as FactionId;
    }
  }

  return { dominantFaction: dominant, percentages };
}

export function getWeatherMovementPenalty(weather: WeatherType): number {
  switch (weather) {
    case 'storm':
      return 0.82; // 18% slower
    case 'snow':
      return 0.88; // 12% slower
    case 'rain':
      return 0.94; // 6% slower
    default:
      return 1.0;
  }
}
