import React, { useState, useEffect } from 'react';
import { 
  PlayerStats, 
  WeatherType, 
  GameViewMode 
} from '../types/game';
import { 
  Sun, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  Hammer, 
  Coins, 
  Gem, 
  Shield, 
  Award, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  Sparkles, 
  BookOpen, 
  Activity, 
  Menu
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface GameHUDProps {
  stats: PlayerStats;
  resources: { [key: string]: number };
  weather: WeatherType;
  onSetWeather: (w: WeatherType) => void;
  dayTime: number; // 0-24
  activeView: GameViewMode;
  onOpenView: (view: GameViewMode) => void;
  isBuildMode: boolean;
  onToggleBuildMode: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  floatingTexts: FloatingText[];
  onTriggerAction: () => void;
  onTriggerJump: () => void;
  onUpdateJoystick: (vec: { x: number; y: number }) => void;
  coordinates: { x: number; y: number; z: number };
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  resources,
  weather,
  onSetWeather,
  dayTime,
  activeView,
  onOpenView,
  isBuildMode,
  onToggleBuildMode,
  isMuted,
  onToggleMute,
  floatingTexts,
  onTriggerAction,
  onTriggerJump,
  onUpdateJoystick,
  coordinates,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);

  // Format Day/Night 24h to 12h AM/PM
  const hours = Math.floor(dayTime);
  const minutes = Math.floor((dayTime % 1) * 60);
  const timeString = `${hours % 12 === 0 ? 12 : hours % 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

  // Keyboard hotkeys for HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'b') {
        onToggleBuildMode();
      } else if (key === 'tab') {
        e.preventDefault();
        onOpenView(activeView === 'market' ? 'playing' : 'market');
      } else if (key === 'f') {
        onOpenView(activeView === 'factions' ? 'playing' : 'factions');
      } else if (key === 'c') {
        onOpenView(activeView === 'character' ? 'playing' : 'character');
      } else if (key === 'q') {
        onOpenView(activeView === 'quests' ? 'playing' : 'quests');
      } else if (key === 'm') {
        onToggleMute();
      } else if (key === 'escape') {
        onOpenView(activeView === 'pause' ? 'playing' : 'pause');
      } else if (key === 'h') {
        setIsDockCollapsed((prev) => !prev);
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        setSelectedHotbarSlot(parseInt(key) - 1);
        sounds.playButtonClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isBuildMode, onOpenView, onToggleBuildMode, onToggleMute]);

  // Touch joystick handling for mobile support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (touch.clientX - centerX) / (rect.width / 2);
    const dy = (touch.clientY - centerY) / (rect.height / 2);
    onUpdateJoystick({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (touch.clientX - centerX) / (rect.width / 2);
    const dy = (touch.clientY - centerY) / (rect.height / 2);
    onUpdateJoystick({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
  };

  const handleTouchEnd = () => {
    onUpdateJoystick({ x: 0, y: 0 });
  };

  const weatherIcons: Record<WeatherType, React.ReactNode> = {
    clear: <Sun className="w-4 h-4 text-amber-400" />,
    rain: <CloudRain className="w-4 h-4 text-sky-400" />,
    storm: <CloudLightning className="w-4 h-4 text-indigo-400" />,
    snow: <Snowflake className="w-4 h-4 text-cyan-300" />,
    twilight: <Sun className="w-4 h-4 text-orange-400" />,
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 md:p-6 select-none font-sans">
      {/* Floating Damage / Resource Popups */}
      {floatingTexts.map((item) => (
        <div
          key={item.id}
          className="absolute font-black text-sm md:text-base pointer-events-none transition-all duration-700 animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            color: item.color,
          }}
        >
          {item.text}
        </div>
      ))}

      {/* TOP BAR: Perimeter status cluster (Left) & Weather/Time (Center) & Utility Controls (Right) */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Character Status & Currencies */}
        <div className="pointer-events-auto bg-slate-950/85 border border-slate-800/90 rounded-xl p-3 space-y-2 max-w-[280px] shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black flex items-center justify-center tabular-nums">
                {stats.level}
              </span>
              <div className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                Aetherian Knight
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              POS: {coordinates.x}, {coordinates.z}
            </div>
          </div>

          {/* Health Bar with trailing pips */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-400">
              <span className="text-red-400">VITALITY</span>
              <span className="tabular-nums text-slate-200">{stats.hp} / {stats.maxHp}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
                style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* Stamina Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-400">
              <span className="text-emerald-400">STAMINA</span>
              <span className="tabular-nums text-slate-200">{stats.stamina} / {stats.maxStamina}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-200"
                style={{ width: `${(stats.stamina / stats.maxStamina) * 100}%` }}
              />
            </div>
          </div>

          {/* Currencies: Gold & Aether Crystals */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span className="tabular-nums">{stats.gold.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Gem className="w-3.5 h-3.5" />
              <span className="tabular-nums">{stats.aetherCrystals}</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Weather System & Celestial Clock */}
        <div className="pointer-events-auto bg-slate-950/85 border border-slate-800/90 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
            {weatherIcons[weather]}
            <span className="capitalize">{weather}</span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
            {timeString}
          </span>

          <span className="text-slate-600">|</span>

          {/* Quick Weather Simulator dropdown */}
          <div className="flex items-center gap-1">
            {(['clear', 'rain', 'storm', 'snow'] as WeatherType[]).map((w) => (
              <button
                key={w}
                onClick={() => onSetWeather(w)}
                className={`p-1 rounded transition text-xs ${
                  weather === w ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Simulate ${w} weather`}
              >
                {weatherIcons[w]}
              </button>
            ))}
          </div>
        </div>

        {/* Top-Right: Quick Navigation Cluster */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/85 border border-slate-800/90 p-1.5 rounded-xl shadow-xl">
          <button
            onClick={onToggleBuildMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isBuildMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
            }`}
            title="Toggle Build Mode [B]"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BUILD [B]</span>
          </button>

          <button
            onClick={() => onOpenView(activeView === 'market' ? 'playing' : 'market')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'market' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
            }`}
            title="Trading Market & Order Book [Tab]"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MARKET [Tab]</span>
          </button>

          <button
            onClick={() => onOpenView(activeView === 'factions' ? 'playing' : 'factions')}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'factions' ? 'bg-red-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
            }`}
            title="Faction War Map [F]"
          >
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden md:inline">WAR [F]</span>
          </button>

          <button
            onClick={() => onOpenView(activeView === 'character' ? 'playing' : 'character')}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'character' ? 'bg-indigo-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
            }`}
            title="Character Progression [C]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">HERO [C]</span>
          </button>

          <button
            onClick={() => onOpenView(activeView === 'quests' ? 'playing' : 'quests')}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'quests' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
            }`}
            title="Quests & Rewards [Q]"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">QUESTS [Q]</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 cursor-pointer"
            title="Mute / Unmute Audio [M]"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => onOpenView(activeView === 'pause' ? 'playing' : 'pause')}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 cursor-pointer"
            title="Pause & Settings [Esc]"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE TOUCH CONTROLS (Virtual Joystick + Action buttons for touchscreen users) */}
      <div className="flex md:hidden justify-between items-end w-full pb-20 pointer-events-none">
        {/* Virtual Analog Joystick */}
        <div
          className="pointer-events-auto w-28 h-28 rounded-full bg-slate-950/60 border-2 border-slate-700/70 flex items-center justify-center relative touch-none shadow-2xl ml-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/80 border border-amber-300 shadow-md" />
        </div>

        {/* Action & Jump buttons */}
        <div className="pointer-events-auto flex flex-col gap-3 mr-2">
          <button
            onClick={onTriggerJump}
            className="w-14 h-14 rounded-full bg-emerald-600/90 border border-emerald-400 text-white font-black text-xs shadow-lg flex items-center justify-center active:scale-95"
          >
            JUMP
          </button>
          <button
            onClick={onTriggerAction}
            className="w-16 h-16 rounded-full bg-rose-600/90 border border-rose-400 text-white font-black text-xs shadow-lg flex items-center justify-center active:scale-95"
          >
            ACTION
          </button>
        </div>
      </div>

      {/* BOTTOM CENTER: Unified Collapsible Control Dock (Per Three.js & Game Craft Directives) */}
      <div className="pointer-events-auto mx-auto max-w-3xl w-full flex flex-col items-center">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsDockCollapsed((prev) => !prev)}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/90 text-slate-400 hover:text-slate-200 px-3 py-1 rounded-t-lg text-[11px] font-mono tracking-wider flex items-center gap-1 transition cursor-pointer mb-[-1px] z-10"
        >
          {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDockCollapsed ? '▴ SHOW COMMAND DOCK [H]' : '▾ HIDE DOCK [H]'}</span>
        </button>

        {/* Collapsible Content */}
        {!isDockCollapsed && (
          <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 shadow-2xl space-y-2 backdrop-blur-none">
            {/* Live Trader Radio / Broadcast Ticker */}
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/70 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-mono overflow-hidden">
              <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span className="text-amber-400 font-bold shrink-0">[COMM LINK]</span>
              <div className="truncate text-slate-400">
                Vanguard Forge producing Masterwork Claymores · Crystal Market Index +4.8% · Faction skirmish active at North Watch
              </div>
            </div>

            {/* Bottom Row: Quick Action Hotbar & Live Inventory Counters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Quick Action Hotbar */}
              <div className="flex items-center gap-1.5">
                {[
                  { name: 'Pickaxe', key: '1', icon: '⛏️' },
                  { name: 'War Axe', key: '2', icon: '🪓' },
                  { name: 'Hammer', key: '3', icon: '🔨' },
                  { name: 'Torch', key: '4', icon: '🕯️' },
                  { name: 'Elixir', key: '5', icon: '🧪' },
                ].map((item, idx) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedHotbarSlot(idx);
                      sounds.playButtonClick();
                    }}
                    className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
                      selectedHotbarSlot === idx
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{item.icon}</span>
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-slate-400">
                      {item.key}
                    </span>
                  </button>
                ))}
              </div>

              {/* Live Inventory Counters */}
              <div className="flex items-center gap-3 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span className="font-semibold text-slate-400">LUMBER:</span>
                  <span className="font-bold tabular-nums">{resources['wood'] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="font-semibold text-slate-400">STONE:</span>
                  <span className="font-bold tabular-nums">{resources['stone'] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-400">
                  <span className="font-semibold text-slate-400">IRON:</span>
                  <span className="font-bold tabular-nums">{resources['iron'] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span className="font-semibold text-slate-400">AETHER:</span>
                  <span className="font-bold tabular-nums">{resources['crystals'] || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
