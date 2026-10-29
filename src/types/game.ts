/**
 * Core type definitions for Aetheria: Realms of Trade & Conquest
 */

export type WeatherType = 'clear' | 'rain' | 'storm' | 'snow' | 'twilight';

export interface WeatherState {
  type: WeatherType;
  temperature: number; // Celsius
  windSpeed: number; // m/s
  precipitation: number; // 0 to 1
  visibility: number; // km
  dayTime: number; // 0 to 24 hours
}

export type FactionId = 'vanguard' | 'solaris' | 'void';

export interface FactionInfo {
  id: FactionId;
  name: string;
  motto: string;
  color: string;
  accentHex: number;
  territoryPercent: number;
  influence: number;
  bonus: string;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  aetherCrystals: number;
  faction: FactionId;
  skillPoints: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'resource' | 'tool' | 'building' | 'cosmetic' | 'consumable';
  count: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number;
  icon: string;
  description: string;
}

export type BuildingType = 
  | 'wood_foundation' 
  | 'stone_wall' 
  | 'wood_doorway' 
  | 'timber_roof' 
  | 'defense_tower' 
  | 'blacksmith_forge';

export interface BuildingRecipe {
  type: BuildingType;
  name: string;
  description: string;
  costs: {
    wood?: number;
    stone?: number;
    iron?: number;
    crystals?: number;
    gold?: number;
  };
  health: number;
  icon: string;
}

export interface PlacedStructure {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  health: number;
  maxHealth: number;
  faction: FactionId;
  builtAt: number;
}

export interface DestructibleObject {
  id: string;
  type: 'tree' | 'rock' | 'crystal' | 'ruin';
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
  yieldResource: 'wood' | 'stone' | 'crystals' | 'iron';
  yieldAmount: number;
  scale: number;
  meshIndex?: number;
}

export interface MarketCommodity {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  prevPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  priceHistory: number[];
  volatility: 'low' | 'moderate' | 'high' | 'extreme';
  supply: number;
}

export interface CosmeticItem {
  id: string;
  name: string;
  tier: 'Legendary' | 'Mythic' | 'Transcendent';
  priceGold: number;
  edition: string;
  statsBonus: string;
  badge: string;
  owned: boolean;
  chainVerified: boolean;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardGold: number;
  rewardXp: number;
  rewardCrystals: number;
  completed: boolean;
  claimed: boolean;
}

export interface TraderMessage {
  id: string;
  sender: string;
  role: string;
  faction: FactionId;
  content: string;
  timestamp: string;
  encrypted: boolean;
}

export type GameViewMode = 
  | 'playing' 
  | 'build_mode' 
  | 'market' 
  | 'factions' 
  | 'character' 
  | 'quests' 
  | 'pause';
