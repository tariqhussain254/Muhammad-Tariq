import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelFromXp,
  calculateHarvestYield,
  canAffordBuilding,
  deductBuildingCosts,
  calculateTradeOrder,
  calculateFactionDominance,
  getWeatherMovementPenalty
} from './rules';

test('Level XP calculation progresses levels correctly', () => {
  const lvl1 = calculateLevelFromXp(50);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.currentXp, 50);

  // Level 1 requires 100 XP
  const lvl2 = calculateLevelFromXp(120);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.currentXp, 20);
});

test('Harvest yield accounts for tool multipliers and perks', () => {
  assert.equal(calculateHarvestYield(10, 1.0, 0), 10);
  assert.equal(calculateHarvestYield(10, 1.5, 0.2), 18);
  assert.equal(calculateHarvestYield(0, 1.0, 0), 1); // Minimum yield clamp
});

test('Building affordability checks inventories accurately', () => {
  const costs = { wood: 50, stone: 20 };
  assert.equal(canAffordBuilding(costs, { wood: 60, stone: 25 }), true);
  assert.equal(canAffordBuilding(costs, { wood: 40, stone: 25 }), false);
  assert.equal(canAffordBuilding(costs, { wood: 60 }), false);
});

test('Building cost deduction subtracts required materials cleanly', () => {
  const costs = { wood: 30, stone: 15 };
  const inv = { wood: 50, stone: 20, iron: 10 };
  const updated = deductBuildingCosts(costs, inv);

  assert.equal(updated.wood, 20);
  assert.equal(updated.stone, 5);
  assert.equal(updated.iron, 10);
});

test('Trade order calculates fees and total amounts correctly', () => {
  const order = calculateTradeOrder(100, 2, 0.02); // 200 + 4 fee
  assert.equal(order.totalCost, 200);
  assert.equal(order.fee, 4);
  assert.equal(order.netTotal, 204);
});

test('Faction dominance calculates leader and percentages', () => {
  const result = calculateFactionDominance({
    vanguard: 500,
    solaris: 300,
    void: 200,
  });
  assert.equal(result.dominantFaction, 'vanguard');
  assert.equal(result.percentages.vanguard, 50);
  assert.equal(result.percentages.solaris, 30);
  assert.equal(result.percentages.void, 20);
});

test('Weather movement speed penalty applies on adverse weather', () => {
  assert.equal(getWeatherMovementPenalty('clear'), 1.0);
  assert.equal(getWeatherMovementPenalty('storm'), 0.82);
  assert.equal(getWeatherMovementPenalty('snow'), 0.88);
});
