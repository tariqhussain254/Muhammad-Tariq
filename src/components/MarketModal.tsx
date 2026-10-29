import React, { useState } from 'react';
import { MarketCommodity, CosmeticItem } from '../types/game';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Bell, 
  RefreshCw, 
  Coins, 
  Gem, 
  X, 
  ArrowRightLeft, 
  CheckCircle2, 
  Lock,
  Moon,
  Sun
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { calculateTradeOrder } from '../utils/rules';

interface MarketModalProps {
  commodities: MarketCommodity[];
  cosmetics: CosmeticItem[];
  gold: number;
  crystals: number;
  inventory: { [key: string]: number };
  onBuyCommodity: (commodityId: string, amount: number) => void;
  onSellCommodity: (commodityId: string, amount: number) => void;
  onBuyCosmetic: (cosmeticId: string) => void;
  onClose: () => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  commodities,
  cosmetics,
  gold,
  crystals,
  inventory,
  onBuyCommodity,
  onSellCommodity,
  onBuyCosmetic,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'commodities' | 'cosmetics' | 'portfolio'>('commodities');
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>(commodities[0]?.id || '');
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<number>(10);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);

  const selectedCommodity = commodities.find((c) => c.id === selectedCommodityId) || commodities[0];
  const orderCalc = calculateTradeOrder(selectedCommodity.currentPrice, tradeAmount);

  // Map commodity symbol to player inventory key
  const commodityToResourceKey: { [symbol: string]: string } = {
    AETH: 'crystals',
    LMBR: 'wood',
    STNE: 'stone',
    IRON: 'iron',
  };
  const resourceKey = commodityToResourceKey[selectedCommodity.symbol] || 'wood';
  const playerOwnedAmount = inventory[resourceKey] || 0;

  const canExecute = tradeAction === 'buy' 
    ? gold >= orderCalc.netTotal 
    : playerOwnedAmount >= tradeAmount;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/75 pointer-events-auto select-none backdrop-blur-none">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl transition-colors ${
        isHighContrast 
          ? 'bg-black border-amber-400 text-white' 
          : 'bg-slate-950 border-slate-800 text-slate-100'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                AETHERIA COMMODITY & COSMETIC EXCHANGE
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  REAL-TIME SIMULATION
                </span>
              </h1>
              <div className="text-xs text-slate-400">
                Persistent open economy with live volatility algorithms & cross-platform escrow
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHighContrast(!isHighContrast)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Toggle Dark / High Contrast Theme"
            >
              {isHighContrast ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                alertsEnabled ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle Volatility Push Alerts"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('commodities');
                sounds.playButtonClick();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'commodities'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Commodity Tickers
            </button>
            <button
              onClick={() => {
                setActiveTab('cosmetics');
                sounds.playButtonClick();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'cosmetics'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Blockchain Cosmetics
            </button>
            <button
              onClick={() => {
                setActiveTab('portfolio');
                sounds.playButtonClick();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'portfolio'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Portfolio & Volatility
            </button>
          </div>

          {/* User Balances */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span className="tabular-nums">{gold.toLocaleString()} Gold</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Gem className="w-3.5 h-3.5" />
              <span className="tabular-nums">{crystals} Crystals</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'commodities' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left Column: Commodities List */}
              <div className="space-y-2 md:col-span-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Live Market Pairs
                </div>
                {commodities.map((item) => {
                  const isUp = item.change24h >= 0;
                  const isSelected = item.id === selectedCommodityId;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedCommodityId(item.id);
                        sounds.playButtonClick();
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{item.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.symbol}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Vol: {item.volume.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-white tabular-nums">
                          {item.currentPrice.toFixed(2)}g
                        </div>
                        <div
                          className={`text-[10px] font-mono font-bold flex items-center justify-end gap-0.5 ${
                            isUp ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span className="tabular-nums">
                            {isUp ? '+' : ''}{item.change24h}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Center & Right Column: Candlestick/Sparkline Chart & Order Execution */}
              <div className="md:col-span-2 space-y-4">
                {/* Chart Box */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Selected Asset</div>
                      <div className="text-lg font-black text-amber-400">
                        {selectedCommodity.name} ({selectedCommodity.symbol}/GOLD)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-mono font-black text-white tabular-nums">
                        {selectedCommodity.currentPrice.toFixed(2)} Gold
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        24h High: {selectedCommodity.high24h.toFixed(2)}g · 24h Low: {selectedCommodity.low24h.toFixed(2)}g
                      </div>
                    </div>
                  </div>

                  {/* SVG Price History Sparkline Chart */}
                  <div className="h-32 w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 flex items-center justify-center relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
                      {/* Price Polyline */}
                      {(() => {
                        const history = selectedCommodity.priceHistory;
                        const min = Math.min(...history) * 0.95;
                        const max = Math.max(...history) * 1.05;
                        const range = max - min || 1;

                        const points = history.map((val, idx) => {
                          const x = (idx / (history.length - 1)) * 300;
                          const y = 100 - ((val - min) / range) * 80 - 10;
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke={selectedCommodity.change24h >= 0 ? '#10b981' : '#f43f5e'}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points}
                            />
                            {/* Gridlines */}
                            <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                            <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                            <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
                      LIVE VOLATILITY: {selectedCommodity.volatility.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Trade Execution Panel */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTradeAction('buy');
                          sounds.playButtonClick();
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          tradeAction === 'buy'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Buy Order
                      </button>
                      <button
                        onClick={() => {
                          setTradeAction('sell');
                          sounds.playButtonClick();
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          tradeAction === 'sell'
                            ? 'bg-rose-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Sell Order
                      </button>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      In Backpack: <span className="text-white font-bold">{playerOwnedAmount}</span> units
                    </div>
                  </div>

                  {/* Quantity Slider / Buttons */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Order Quantity:</span>
                      <span className="font-mono font-bold text-amber-400">{tradeAmount} units</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[5, 10, 25, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => {
                            setTradeAmount(amt);
                            sounds.playButtonClick();
                          }}
                          className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer ${
                            tradeAmount === amt
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Settlement Breakdown */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span className="text-slate-200">{orderCalc.totalCost.toFixed(2)}g</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Exchange Protocol Fee (1.5%):</span>
                      <span className="text-slate-200">{orderCalc.fee.toFixed(2)}g</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                      <span>Net Settlement:</span>
                      <span className="text-amber-400 tabular-nums">{orderCalc.netTotal.toFixed(2)} Gold</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => {
                      if (canExecute) {
                        if (tradeAction === 'buy') {
                          onBuyCommodity(selectedCommodity.id, tradeAmount);
                        } else {
                          onSellCommodity(selectedCommodity.id, tradeAmount);
                        }
                        sounds.playTradeChime();
                      }
                    }}
                    disabled={!canExecute}
                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                      canExecute
                        ? tradeAction === 'buy'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95'
                          : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {canExecute
                      ? `Execute ${tradeAction.toUpperCase()} (${orderCalc.netTotal.toFixed(2)}g)`
                      : 'Insufficient Funds / Inventory'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cosmetics' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Transparent Blockchain Item Authentication & Cryptographic Escrow</span>
                </div>
                <span className="font-mono text-slate-400 text-[10px]">EVM CONTRACT 0x7F...9B42</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cosmetics.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                          {item.tier}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {item.edition}
                        </span>
                      </div>
                      <div className="text-3xl my-3 text-center">{item.badge}</div>
                      <div className="text-sm font-black text-white text-center">{item.name}</div>
                      <div className="text-[11px] text-slate-400 text-center mt-1">
                        Bonus: <span className="text-emerald-400">{item.statsBonus}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Price:</span>
                        <span className="font-bold text-amber-400">{item.priceGold.toLocaleString()} Gold</span>
                      </div>

                      {item.owned ? (
                        <div className="w-full py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>OWNED & EQUIPPED</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (gold >= item.priceGold) {
                              onBuyCosmetic(item.id);
                              sounds.playTradeChime();
                            }
                          }}
                          disabled={gold < item.priceGold}
                          className={`w-full py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            gold >= item.priceGold
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {gold >= item.priceGold ? 'Mint & Trade Item' : 'Insufficient Gold'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Total Portfolio Value</div>
                  <div className="text-2xl font-mono font-black text-amber-400 mt-1">
                    {(gold + crystals * 85 + (inventory['wood'] || 0) * 4).toLocaleString()} Gold
                  </div>
                  <div className="text-xs text-emerald-400 font-mono mt-1">+14.2% Unrealized 24h PnL</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Composite Volatility Index</div>
                  <div className="text-2xl font-mono font-black text-cyan-400 mt-1">
                    42.8 IV
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">Moderate Risk Environment</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Verified Blockchain Escrow</div>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1 flex items-center gap-2">
                    <Lock className="w-5 h-5" /> 100% SECURE
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">Anti-Cheat Validated</div>
                </div>
              </div>

              {/* Trader Notice */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-amber-400">Offline Trading Engine & Synchronization</div>
                <p>
                  Orders queued while traveling offline or between gaming sessions are automatically reconciled by the decentralized consensus ledger once reconnection occurs. Volatility warnings alert you when crystal market swings exceed 8% within a single game hour.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
