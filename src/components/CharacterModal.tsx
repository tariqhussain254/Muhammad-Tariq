import React from 'react';
import { PlayerStats } from '../types/game';
import { Sparkles, X, Plus, Shield, Award, Zap, Compass } from 'lucide-react';
import { sounds } from '../utils/audio';

interface CharacterModalProps {
  stats: PlayerStats;
  onAllocateSkillPoint: (tree: 'combat' | 'survival' | 'engineering' | 'tycoon') => void;
  onClose: () => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  stats,
  onAllocateSkillPoint,
  onClose,
}) => {
  const skillTrees = [
    {
      id: 'survival' as const,
      name: 'Pioneer Survival',
      description: 'Increases Maximum Vitality and sprint stamina endurance in extreme storms.',
      level: 2,
      maxLevel: 5,
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/40 bg-emerald-950/20',
    },
    {
      id: 'engineering' as const,
      name: 'Architectural Engineering',
      description: 'Improves modular building health and grants 25% chance of resource salvage.',
      level: 3,
      maxLevel: 5,
      icon: <Compass className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/40 bg-amber-950/20',
    },
    {
      id: 'tycoon' as const,
      name: 'Commodity Tycoon',
      description: 'Reduces market exchange protocol fees and boosts raw harvesting yield.',
      level: 1,
      maxLevel: 5,
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      color: 'border-cyan-500/40 bg-cyan-950/20',
    },
    {
      id: 'combat' as const,
      name: 'Vanguard Combat',
      description: 'Accelerates tool swing speed, increases impact shockwaves, and stagger recovery.',
      level: 2,
      maxLevel: 5,
      icon: <Sparkles className="w-5 h-5 text-rose-400" />,
      color: 'border-rose-500/40 bg-rose-950/20',
    },
  ];

  const badges = [
    { title: 'Realm Pioneer', desc: 'Explored Aetheria continent bounds', icon: '🧭', unlocked: true },
    { title: 'Master Mason', desc: 'Constructed fortified stone architecture', icon: '🏰', unlocked: true },
    { title: 'Aether Tycoon', desc: 'Traded over 1,000 Gold on the Exchange', icon: '💎', unlocked: true },
    { title: 'Storm Walker', desc: 'Survived violent thunderstorm blizzard', icon: '⚡', unlocked: false },
    { title: 'Apex Conqueror', desc: 'Captured all contested realm outposts', icon: '👑', unlocked: false },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/75 pointer-events-auto select-none backdrop-blur-none">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                CHARACTER PROGRESSION & SKILL MATRIX
              </h1>
              <div className="text-xs text-slate-400">
                Level {stats.level} · Unspent Skill Points: <span className="text-amber-400 font-bold font-mono">{stats.skillPoints}</span>
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Skill Trees */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Specialization Branches
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skillTrees.map((tree) => (
                <div
                  key={tree.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${tree.color}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {tree.icon}
                      <div>
                        <div className="text-xs font-bold text-white">{tree.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Tier {tree.level} / {tree.maxLevel}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (stats.skillPoints > 0) {
                          onAllocateSkillPoint(tree.id);
                          sounds.playLevelUp();
                        }
                      }}
                      disabled={stats.skillPoints <= 0 || tree.level >= tree.maxLevel}
                      className={`p-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        stats.skillPoints > 0 && tree.level < tree.maxLevel
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                      title="Upgrade Skill (+1 Point)"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">{tree.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Collectible Badges */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Collectible Trading Badges & Honors</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {badges.map((b) => (
                <div
                  key={b.title}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 ${
                    b.unlocked
                      ? 'border-amber-500/40 bg-amber-950/20 text-slate-100'
                      : 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-60'
                  }`}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <div className="text-[11px] font-bold mt-1">{b.title}</div>
                  <div className="text-[9px] text-slate-400 line-clamp-2">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
