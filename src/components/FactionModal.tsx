import React from 'react';
import { FactionId, FactionInfo } from '../types/game';
import { Shield, Sun, Eye, X, Flag, Swords, Trophy } from 'lucide-react';
import { sounds } from '../utils/audio';

interface FactionModalProps {
  playerFaction: FactionId;
  factions: Record<FactionId, FactionInfo>;
  onContributeInfluence: (faction: FactionId, amount: number) => void;
  gold: number;
  onClose: () => void;
}

export const FactionModal: React.FC<FactionModalProps> = ({
  playerFaction,
  factions,
  onContributeInfluence,
  gold,
  onClose,
}) => {
  const factionIcons: Record<FactionId, React.ReactNode> = {
    vanguard: <Shield className="w-5 h-5 text-red-400" />,
    solaris: <Sun className="w-5 h-5 text-amber-400" />,
    void: <Eye className="w-5 h-5 text-cyan-400" />,
  };

  const outposts = [
    { name: 'North Watch Bastion', controller: 'vanguard', strategicValue: '+15% Armor Crafting' },
    { name: 'Sunken Harbor Market', controller: 'solaris', strategicValue: '+20% Trade Tax Exemption' },
    { name: 'Whispering Crystal Spire', controller: 'void', strategicValue: '+25% Aether Node Yield' },
    { name: 'Valley Stone Quarry', controller: 'vanguard', strategicValue: '+18% Masonry Strength' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/75 pointer-events-auto select-none backdrop-blur-none">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                AETHERIA REALM WAR & FACTION POLITICS
              </h1>
              <div className="text-xs text-slate-400">
                Territory dominance, tactical outposts, and global balance of power
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Faction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(factions) as FactionId[]).map((fId) => {
              const f = factions[fId];
              const isPlayer = fId === playerFaction;

              return (
                <div
                  key={fId}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 relative ${
                    isPlayer
                      ? 'border-amber-400 bg-amber-950/20 ring-1 ring-amber-400/50'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  {isPlayer && (
                    <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      YOUR ALLEGIANCE
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-2 font-black text-sm text-white">
                      {factionIcons[fId]}
                      <span>{f.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 italic mt-0.5">"{f.motto}"</div>
                    <div className="text-xs text-amber-300 font-medium mt-2">Bonus: {f.bonus}</div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Territory:</span>
                      <span className="font-bold text-white tabular-nums">{f.territoryPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${f.territoryPercent}%`,
                          backgroundColor: f.color,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (gold >= 50) {
                        onContributeInfluence(fId, 50);
                        sounds.playTradeChime();
                      }
                    }}
                    disabled={gold < 50}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      gold >= 50
                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Contribute (50 Gold)</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Outpost Conquest Status */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-amber-400" />
              <span>Contested Outposts & Garrisons</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {outposts.map((op) => (
                <div
                  key={op.name}
                  className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{op.name}</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{op.strategicValue}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                    {factionIcons[op.controller as FactionId]}
                    <span className="capitalize">{op.controller}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
