import React, { useState } from 'react';
import { Volume2, VolumeX, Play, RotateCcw, Home, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnTitle,
  isMuted,
  onToggleMute,
}) => {
  const [sfxVol, setSfxVol] = useState(0.8);
  const [ambVol, setAmbVol] = useState(0.4);

  const handleSfxChange = (v: number) => {
    setSfxVol(v);
    sounds.setVolume(v, ambVol);
  };

  const handleAmbChange = (v: number) => {
    setAmbVol(v);
    sounds.setVolume(sfxVol, v);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none backdrop-blur-none">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-wider text-amber-400 font-serif">
            GAME PAUSED
          </h2>
          <p className="text-xs text-slate-400">Simulation suspended · Real-time world state preserved</p>
        </div>

        {/* Audio Sliders & Settings */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Master Sound</span>
            <button
              onClick={onToggleMute}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span className="font-mono">{isMuted ? 'Muted' : 'Enabled'}</span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Sound Effects</span>
              <span className="tabular-nums">{Math.round(sfxVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVol}
              onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Weather & Ambience</span>
              <span className="tabular-nums">{Math.round(ambVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={ambVol}
              onChange={(e) => handleAmbChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Simulation [Esc]</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Respawn at Realm Citadel</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="w-full py-2 bg-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-semibold text-xs tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
