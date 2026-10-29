import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AetheriaEngine } from './game/threeEngine';
import { 
  BuildingType, 
  CosmeticItem, 
  DailyQuest, 
  FactionId, 
  FactionInfo, 
  GameViewMode, 
  MarketCommodity, 
  PlacedStructure, 
  PlayerStats, 
  WeatherType 
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { BuildOverlay, BUILDING_RECIPES } from './components/BuildOverlay';
import { MarketModal } from './components/MarketModal';
import { FactionModal } from './components/FactionModal';
import { CharacterModal } from './components/CharacterModal';
import { SocialQuestsModal } from './components/SocialQuestsModal';
import { PauseModal } from './components/PauseModal';
import { sounds } from './utils/audio';
import { 
  calculateHarvestYield, 
  calculateLevelFromXp, 
  deductBuildingCosts, 
  simulateMarketTick 
} from './utils/rules';

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AetheriaEngine | null>(null);

  // Check ?autostart=1
  const isAutostart = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  // Game state
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>(isAutostart ? 'playing' : 'title');
  const [activeView, setActiveView] = useState<GameViewMode>('playing');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [isBuildMode, setIsBuildMode] = useState<boolean>(false);
  const [selectedBuildType, setSelectedBuildType] = useState<BuildingType>('wood_foundation');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0, z: 0 });
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Player Stats
  const [stats, setStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    xp: 0,
    maxXp: 100,
    gold: 450,
    aetherCrystals: 24,
    faction: 'vanguard',
    skillPoints: 2,
  });

  // Resources in backpack
  const [resources, setResources] = useState<{ [key: string]: number }>({
    wood: 65,
    stone: 50,
    iron: 25,
    crystals: 24,
  });

  // Factions
  const [factions, setFactions] = useState<Record<FactionId, FactionInfo>>({
    vanguard: {
      id: 'vanguard',
      name: 'Iron Vanguard',
      motto: 'Strength Through Steel',
      color: '#ef4444',
      accentHex: 0xef4444,
      territoryPercent: 42,
      influence: 4200,
      bonus: '+15% Armor Defense & Crafting Speed',
    },
    solaris: {
      id: 'solaris',
      name: 'Solaris Guild',
      motto: 'Radiance of Open Markets',
      color: '#f59e0b',
      accentHex: 0xf59e0b,
      territoryPercent: 35,
      influence: 3500,
      bonus: '-50% Market Trade Protocol Fees',
    },
    void: {
      id: 'void',
      name: 'Void Seekers',
      motto: 'Whispers of the Eternal Aether',
      color: '#06b6d4',
      accentHex: 0x06b6d4,
      territoryPercent: 23,
      influence: 2300,
      bonus: '+25% Aether Crystal Mining & Alchemical Yield',
    },
  });

  // Market Commodities
  const [commodities, setCommodities] = useState<MarketCommodity[]>([
    {
      id: 'c1',
      name: 'Aether Crystals',
      symbol: 'AETH',
      currentPrice: 85.5,
      prevPrice: 78.0,
      change24h: 9.6,
      high24h: 89.2,
      low24h: 74.5,
      volume: 14820,
      priceHistory: [74, 76, 75, 78, 82, 80, 85.5],
      volatility: 'high',
      supply: 5000,
    },
    {
      id: 'c2',
      name: 'Ancient Lumber',
      symbol: 'LMBR',
      currentPrice: 4.8,
      prevPrice: 4.5,
      change24h: 6.7,
      high24h: 5.1,
      low24h: 4.2,
      volume: 42300,
      priceHistory: [4.2, 4.3, 4.4, 4.6, 4.5, 4.7, 4.8],
      volatility: 'low',
      supply: 28000,
    },
    {
      id: 'c3',
      name: 'Refined Dragonsteel',
      symbol: 'IRON',
      currentPrice: 22.4,
      prevPrice: 24.1,
      change24h: -7.1,
      high24h: 25.0,
      low24h: 21.8,
      volume: 9150,
      priceHistory: [25, 24.8, 24.2, 23.5, 23.1, 22.8, 22.4],
      volatility: 'moderate',
      supply: 8400,
    },
    {
      id: 'c4',
      name: 'Granite Masonry',
      symbol: 'STNE',
      currentPrice: 3.2,
      prevPrice: 3.1,
      change24h: 3.2,
      high24h: 3.4,
      low24h: 3.0,
      volume: 38000,
      priceHistory: [3.0, 3.1, 3.1, 3.2, 3.1, 3.2, 3.2],
      volatility: 'low',
      supply: 35000,
    },
  ]);

  // Rare NFT Cosmetics
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([
    {
      id: 'cos1',
      name: 'Solar Phoenix Cape',
      tier: 'Legendary',
      priceGold: 350,
      edition: 'Genesis #042',
      statsBonus: '+10% Movement Speed',
      badge: '🦅',
      owned: false,
      chainVerified: true,
    },
    {
      id: 'cos2',
      name: 'Obsidian Dreadplate',
      tier: 'Mythic',
      priceGold: 750,
      edition: 'Citadel #018',
      statsBonus: '+20 Max Vitality',
      badge: '🛡️',
      owned: false,
      chainVerified: true,
    },
    {
      id: 'cos3',
      name: 'Void Archon Crown',
      tier: 'Transcendent',
      priceGold: 1200,
      edition: 'Eternal #007',
      statsBonus: '+15% All Harvest Yields',
      badge: '👑',
      owned: false,
      chainVerified: true,
    },
  ]);

  // Daily Quests
  const [quests, setQuests] = useState<DailyQuest[]>([
    {
      id: 'q1',
      title: 'Harvest the Ancient Woods',
      description: 'Chop down pine and oak trees to collect 30 Lumber.',
      targetCount: 30,
      currentCount: 30,
      rewardGold: 100,
      rewardXp: 80,
      rewardCrystals: 5,
      completed: true,
      claimed: false,
    },
    {
      id: 'q2',
      title: 'Quarry Granite & Iron',
      description: 'Extract 20 units of Stone and Iron ore veins.',
      targetCount: 20,
      currentCount: 20,
      rewardGold: 120,
      rewardXp: 90,
      rewardCrystals: 6,
      completed: true,
      claimed: false,
    },
    {
      id: 'q3',
      title: 'Aetheria Architecture',
      description: 'Place 2 modular structures in the realm.',
      targetCount: 2,
      currentCount: 2,
      rewardGold: 150,
      rewardXp: 120,
      rewardCrystals: 8,
      completed: true,
      claimed: false,
    },
  ]);

  // Sync document.body.dataset.state per guidelines
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Initialize Three.js Engine once inside ref container
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new AetheriaEngine(mountRef.current, {
      onResourceHarvested: (res, baseAmt, worldPos) => {
        const yieldAmt = calculateHarvestYield(baseAmt, 1.0, 0.1);
        
        // Add resources
        setResources((prev) => ({
          ...prev,
          [res]: (prev[res] || 0) + yieldAmt,
        }));

        // Award XP and check level progression
        setStats((prev) => {
          const newXpTotal = prev.xp + 25;
          const { level: newLevel, currentXp, maxXp } = calculateLevelFromXp(newXpTotal);
          
          if (newLevel > prev.level) {
            sounds.playLevelUp();
            return {
              ...prev,
              level: newLevel,
              xp: currentXp,
              maxXp,
              skillPoints: prev.skillPoints + (newLevel - prev.level),
              maxHp: prev.maxHp + 10,
              hp: prev.maxHp + 10,
            };
          }

          return {
            ...prev,
            xp: currentXp,
            maxXp,
          };
        });

        // Spawn floating text
        const popupId = `float_${Date.now()}_${Math.random()}`;
        const color = res === 'crystals' ? '#38bdf8' : res === 'iron' ? '#fb923c' : res === 'wood' ? '#fcd34d' : '#e2e8f0';
        const screenX = window.innerWidth / 2 + (Math.random() - 0.5) * 60;
        const screenY = window.innerHeight / 2 - 40 + (Math.random() - 0.5) * 40;

        setFloatingTexts((prev) => [
          ...prev,
          {
            id: popupId,
            text: `+${yieldAmt} ${res.toUpperCase()}`,
            x: screenX,
            y: screenY,
            color,
          },
        ]);

        setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((item) => item.id !== popupId));
        }, 800);
      },

      onStructureBuilt: (structure: PlacedStructure) => {
        const recipe = BUILDING_RECIPES.find((r) => r.type === structure.type);
        if (recipe) {
          setResources((prev) => deductBuildingCosts(recipe.costs, prev));
        }
      },

      onPlayerPositionUpdate: (pos) => {
        setCoordinates({ x: pos.x, y: pos.y, z: pos.z });
      },
    });

    engineRef.current = engine;
    engine.setTitleMode(!isAutostart);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [isAutostart]);

  // Periodic Market Ticker Simulation (every 4 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCommodities((prev) =>
        prev.map((c) => simulateMarketTick(c))
      );
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Handlers
  const handleStartGame = useCallback(() => {
    sounds.resume();
    sounds.playLevelUp();
    setGameState('playing');
    setActiveView('playing');
    document.body.dataset.state = 'playing';
    if (engineRef.current) {
      engineRef.current.setTitleMode(false);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleSetWeather = (w: WeatherType) => {
    setWeather(w);
    if (engineRef.current) {
      engineRef.current.setWeather(w);
    }
  };

  const handleToggleBuildMode = () => {
    const next = !isBuildMode;
    setIsBuildMode(next);
    if (engineRef.current) {
      engineRef.current.isBuildModeActive = next;
    }
    sounds.playButtonClick();
  };

  const handleSelectBuildType = (t: BuildingType) => {
    setSelectedBuildType(t);
    if (engineRef.current) {
      engineRef.current.setBuildType(t);
    }
  };

  const handleRotateBuild = () => {
    if (engineRef.current) {
      engineRef.current.rotateBuild();
    }
  };

  const handlePlaceStructure = () => {
    if (engineRef.current) {
      engineRef.current.placeStructure();
    }
  };

  // Market Orders
  const handleBuyCommodity = (id: string, amount: number) => {
    const item = commodities.find((c) => c.id === id);
    if (!item) return;
    const cost = Math.round(item.currentPrice * amount * 1.015);
    if (stats.gold < cost) return;

    setStats((prev) => ({ ...prev, gold: prev.gold - cost }));
    const resKey = id === 'c1' ? 'crystals' : id === 'c2' ? 'wood' : id === 'c3' ? 'iron' : 'stone';
    setResources((prev) => ({ ...prev, [resKey]: (prev[resKey] || 0) + amount }));
  };

  const handleSellCommodity = (id: string, amount: number) => {
    const item = commodities.find((c) => c.id === id);
    if (!item) return;
    const resKey = id === 'c1' ? 'crystals' : id === 'c2' ? 'wood' : id === 'c3' ? 'iron' : 'stone';
    if ((resources[resKey] || 0) < amount) return;

    const earnings = Math.round(item.currentPrice * amount * 0.985);
    setResources((prev) => ({ ...prev, [resKey]: prev[resKey] - amount }));
    setStats((prev) => ({ ...prev, gold: prev.gold + earnings }));
  };

  const handleBuyCosmetic = (cosId: string) => {
    const cos = cosmetics.find((c) => c.id === cosId);
    if (!cos || stats.gold < cos.priceGold) return;

    setStats((prev) => ({ ...prev, gold: prev.gold - cos.priceGold }));
    setCosmetics((prev) =>
      prev.map((c) => (c.id === cosId ? { ...c, owned: true } : c))
    );
  };

  const handleContributeFaction = (fId: FactionId, amount: number) => {
    if (stats.gold < amount) return;
    setStats((prev) => ({ ...prev, gold: prev.gold - amount }));
    setFactions((prev) => {
      const updated = { ...prev };
      updated[fId].influence += amount * 10;
      // Recalculate percentages
      const total = updated.vanguard.influence + updated.solaris.influence + updated.void.influence;
      updated.vanguard.territoryPercent = Math.round((updated.vanguard.influence / total) * 100);
      updated.solaris.territoryPercent = Math.round((updated.solaris.influence / total) * 100);
      updated.void.territoryPercent = 100 - updated.vanguard.territoryPercent - updated.solaris.territoryPercent;
      return updated;
    });
  };

  const handleClaimQuest = (qId: string) => {
    const q = quests.find((item) => item.id === qId);
    if (!q || q.claimed) return;

    setQuests((prev) =>
      prev.map((item) => (item.id === qId ? { ...item, claimed: true } : item))
    );
    setStats((prev) => ({
      ...prev,
      gold: prev.gold + q.rewardGold,
      xp: prev.xp + q.rewardXp,
      aetherCrystals: prev.aetherCrystals + q.rewardCrystals,
    }));
  };

  const handleAllocateSkill = (tree: 'combat' | 'survival' | 'engineering' | 'tycoon') => {
    if (stats.skillPoints <= 0) return;
    setStats((prev) => ({
      ...prev,
      skillPoints: prev.skillPoints - 1,
      maxHp: tree === 'survival' ? prev.maxHp + 25 : prev.maxHp,
      hp: tree === 'survival' ? prev.hp + 25 : prev.hp,
    }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-white select-none">
      {/* Isolated Three.js WebGL Canvas Mount Container */}
      <div 
        ref={mountRef} 
        data-testid="webgl-canvas"
        className="absolute inset-0 z-0 touch-none"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          selectedFaction={stats.faction}
          onSelectFaction={(f) => setStats((prev) => ({ ...prev, faction: f }))}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game HUD (Always visible when in playing or modal sub-views) */}
      {gameState !== 'title' && (
        <GameHUD
          stats={stats}
          resources={resources}
          weather={weather}
          onSetWeather={handleSetWeather}
          dayTime={11.5}
          activeView={activeView}
          onOpenView={(v) => {
            setActiveView(v);
            if (v === 'pause') {
              setGameState('paused');
            } else if (gameState === 'paused' && v === 'playing') {
              setGameState('playing');
            }
          }}
          isBuildMode={isBuildMode}
          onToggleBuildMode={handleToggleBuildMode}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          floatingTexts={floatingTexts}
          onTriggerAction={() => {
            if (engineRef.current) engineRef.current.triggerPlayerAction();
          }}
          onTriggerJump={() => {
            if (engineRef.current) engineRef.current.keys[' '] = true;
            setTimeout(() => {
              if (engineRef.current) engineRef.current.keys[' '] = false;
            }, 80);
          }}
          onUpdateJoystick={(vec) => {
            if (engineRef.current) engineRef.current.joystickVector = vec;
          }}
          coordinates={coordinates}
        />
      )}

      {/* Build Mode Blueprint Overlay */}
      {gameState !== 'title' && isBuildMode && (
        <BuildOverlay
          selectedType={selectedBuildType}
          onSelectType={handleSelectBuildType}
          onRotate={handleRotateBuild}
          onPlace={handlePlaceStructure}
          onClose={handleToggleBuildMode}
          inventory={resources}
        />
      )}

      {/* Market & Order Book Modal */}
      {activeView === 'market' && (
        <MarketModal
          commodities={commodities}
          cosmetics={cosmetics}
          gold={stats.gold}
          crystals={stats.aetherCrystals}
          inventory={resources}
          onBuyCommodity={handleBuyCommodity}
          onSellCommodity={handleSellCommodity}
          onBuyCosmetic={handleBuyCosmetic}
          onClose={() => setActiveView('playing')}
        />
      )}

      {/* Faction Realm War Modal */}
      {activeView === 'factions' && (
        <FactionModal
          playerFaction={stats.faction}
          factions={factions}
          onContributeInfluence={handleContributeFaction}
          gold={stats.gold}
          onClose={() => setActiveView('playing')}
        />
      )}

      {/* Character Progression Matrix Modal */}
      {activeView === 'character' && (
        <CharacterModal
          stats={stats}
          onAllocateSkillPoint={handleAllocateSkill}
          onClose={() => setActiveView('playing')}
        />
      )}

      {/* Social, Quests & Encrypted Comms Modal */}
      {activeView === 'quests' && (
        <SocialQuestsModal
          quests={quests}
          onClaimQuest={handleClaimQuest}
          onClose={() => setActiveView('playing')}
        />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => {
            setGameState('playing');
            setActiveView('playing');
          }}
          onRestart={() => {
            setGameState('playing');
            setActiveView('playing');
            if (engineRef.current) {
              engineRef.current.setTitleMode(false);
            }
          }}
          onReturnTitle={() => {
            setGameState('title');
            setActiveView('playing');
            if (engineRef.current) {
              engineRef.current.setTitleMode(true);
            }
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
    </div>
  );
}
