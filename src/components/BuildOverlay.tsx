import React from 'react';
import { BuildingRecipe, BuildingType } from '../types/game';
import { RotateCw, Check, X, ShieldAlert } from 'lucide-react';
import { canAffordBuilding } from '../utils/rules';
import { sounds } from '../utils/audio';

export const BUILDING_RECIPES: BuildingRecipe[] = [
  {
    type: 'wood_foundation',
    name: 'Timber Foundation',
    description: 'Heavy oak floor platform with corner foundation pilings.',
    costs: { wood: 20 },
    health: 200,
    icon: '🪵',
  },
  {
    type: 'stone_wall',
    name: 'Ashlar Stone Wall',
    description: 'Fortified stone masonry wall with top timber reinforcement.',
    costs: { stone: 25 },
    health: 350,
    icon: '🧱',
  },
  {
    type: 'wood_doorway',
    name: 'Reinforced Doorway',
    description: 'Timber jambs and arched frame for fortified entrance.',
    costs: { wood: 15, stone: 10 },
    health: 250,
    icon: '🚪',
  },
  {
    type: 'timber_roof',
    name: 'Pyramidal Roof',
    description: 'Sloped timber shingles protecting against stormy weather.',
    costs: { wood: 20 },
    health: 180,
    icon: '🛖',
  },
  {
    type: 'defense_tower',
    name: 'Watchtower Bastion',
    description: 'Elevated platform with defensive battlements & beacon fire.',
    costs: { wood: 45, stone: 35, iron: 15 },
    health: 600,
    icon: '🏰',
  },
  {
    type: 'blacksmith_forge',
    name: 'Crafting Forge',
    description: 'High-temperature stone furnace and anvil for forging gear.',
    costs: { stone: 40, iron: 20, crystals: 5 },
    health: 450,
    icon: '⚒️',
  },
];

interface BuildOverlayProps {
  selectedType: BuildingType;
  onSelectType: (t: BuildingType) => void;
  onRotate: () => void;
  onPlace: () => void;
  onClose: () => void;
  inventory: { [key: string]: number };
}

export const BuildOverlay: React.FC<BuildOverlayProps> = ({
  selectedType,
  onSelectType,
  onRotate,
  onPlace,
  onClose,
  inventory,
}) => {
  const currentRecipe = BUILDING_RECIPES.find((r) => r.type === selectedType) || BUILDING_RECIPES[0];
  const canAfford = canAffordBuilding(currentRecipe.costs, inventory);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-full max-w-2xl px-4 select-none">
      <div className="bg-slate-950/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl space-y-4">
        {/* Header & Controls Hint */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Modular Construction Blueprint
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRotate();
                sounds.playButtonClick();
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
              title="Rotate structure 90° [R]"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Rotate [R]</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Exit Build Mode [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Structure Selection Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {BUILDING_RECIPES.map((recipe) => {
            const affordable = canAffordBuilding(recipe.costs, inventory);
            const isSelected = recipe.type === selectedType;

            return (
              <button
                key={recipe.type}
                onClick={() => {
                  onSelectType(recipe.type);
                  sounds.playButtonClick();
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/50'
                    : affordable
                    ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-200'
                    : 'border-slate-900 bg-slate-950/80 text-slate-500 opacity-60'
                }`}
              >
                <span className="text-2xl">{recipe.icon}</span>
                <span className="text-[11px] font-bold text-center leading-tight">
                  {recipe.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Recipe Details & Place CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="text-xs font-bold text-slate-200">{currentRecipe.name}</div>
            <div className="text-[11px] text-slate-400">{currentRecipe.description}</div>
            {/* Required Materials */}
            <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
              {Object.entries(currentRecipe.costs).map(([res, req]) => {
                const have = inventory[res] || 0;
                const hasEnough = have >= req;
                return (
                  <span
                    key={res}
                    className={`flex items-center gap-1 ${
                      hasEnough ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'
                    }`}
                  >
                    <span className="uppercase">{res}:</span>
                    <span className="tabular-nums">
                      {have}/{req}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              if (canAfford) {
                onPlace();
              }
            }}
            disabled={!canAfford}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition ${
              canAfford
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {canAfford ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Place Structure</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Insufficient Materials</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
