import React, { useEffect } from 'react';
import { FactionId } from '../types/game';
import { Shield, Sun, Eye, Volume2, VolumeX, Play } from 'lucide-react';
import { sounds } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: () => void;
  selectedFaction: FactionId;
  onSelectFaction: (faction: FactionId) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  selectedFaction,
  onSelectFaction,
  isMuted,
  onToggleMute,
}) => {
  // Listen for Enter and Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-12 text-slate-100 select-none">
      {/* Top Bar: Game Engine & Server State */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3 bg-slate-950/80 border border-amber-500/30 px-3.5 py-1.5 rounded-lg text-xs tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-amber-400">SERVER CLUSTER 01</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-300 tabular-nums">60 FPS · 18ms</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-400 font-mono">ANTI-CHEAT ACTIVE</span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 hover:border-amber-400/60 px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-slate-200"
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="font-medium">{isMuted ? 'MUTED [M]' : 'SOUND ON [M]'}</span>
        </button>
      </div>

      {/* Center Left: Bespoke Title Lockup & Start Handshake */}
      <div className="max-w-xl pointer-events-auto space-y-6 my-auto">
        {/* Bespoke Inline SVG Emblem & Title Lockup */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <svg className="w-12 h-12 text-amber-400 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L38 14V34L24 44L10 34V14L24 4Z" stroke="currentColor" strokeWidth="2.5" fill="rgba(245, 158, 11, 0.15)" />
              <path d="M24 10L32 16V30L24 36L16 30V16L24 10Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M24 16V32M16 24H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <span className="text-xs uppercase font-bold tracking-[0.3em] text-amber-400">OPEN WORLD SANDBOX MMORPG</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-serif drop-shadow-md">
                AETHERIA
              </h1>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md drop-shadow">
            Realms of Trade & Conquest. Explore persistent dynamic biomes, harvest destructible landscapes, build modular fortresses, and dominate a live player-driven commodity exchange.
          </p>
        </div>

        {/* Faction Alignment Selector */}
        <div className="bg-slate-950/85 border border-slate-800 p-4 rounded-xl space-y-3 backdrop-blur-none">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Choose Faction Allegiance</div>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => {
                onSelectFaction('vanguard');
                sounds.playButtonClick();
              }}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                selectedFaction === 'vanguard'
                  ? 'border-red-500 bg-red-950/40 text-red-200 ring-1 ring-red-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Shield className="w-3.5 h-3.5 text-red-400" />
                <span>Vanguard</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Fortification & Heavy Industry</div>
            </button>

            <button
              onClick={() => {
                onSelectFaction('solaris');
                sounds.playButtonClick();
              }}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                selectedFaction === 'solaris'
                  ? 'border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Solaris</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Free Trade & High Commerce</div>
            </button>

            <button
              onClick={() => {
                onSelectFaction('void');
                sounds.playButtonClick();
              }}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                selectedFaction === 'void'
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Void</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Aether Alchemy & Magic</div>
            </button>
          </div>
        </div>

        {/* Primary CTA Handshake (data-start="true") */}
        <div className="pt-2">
          <button
            data-start="true"
            onClick={onStartGame}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base tracking-wide rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ENTER AETHERIA REALM</span>
          </button>
        </div>
      </div>

      {/* Flat borderless control hint line in bottom safe margin */}
      <div className="w-full flex justify-center pointer-events-auto">
        <div className="bg-slate-950/85 border border-slate-800/90 px-5 py-2 rounded-full text-xs text-slate-300 font-mono tracking-wide shadow-lg">
          WASD / Touch Move · Space Jump · E Harvest · B Build Mode · Tab Exchange · F Factions · Esc Pause
        </div>
      </div>
    </div>
  );
};
