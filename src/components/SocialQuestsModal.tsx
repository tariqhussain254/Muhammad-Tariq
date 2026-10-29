import React, { useState } from 'react';
import { DailyQuest, TraderMessage } from '../types/game';
import { 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Users, 
  X, 
  CheckCircle2, 
  Gift, 
  Radio, 
  Send, 
  Lock,
  Trophy
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface SocialQuestsModalProps {
  quests: DailyQuest[];
  onClaimQuest: (questId: string) => void;
  onClose: () => void;
}

export const SocialQuestsModal: React.FC<SocialQuestsModalProps> = ({
  quests,
  onClaimQuest,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'quests' | 'calendar' | 'chat' | 'referrals'>('quests');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<TraderMessage[]>([
    {
      id: 'm1',
      sender: 'Commander Thorne',
      role: 'Iron Vanguard Marshall',
      faction: 'vanguard',
      content: 'Fortifying the North Watch against incoming blizzard. Stone deliveries needed at the gates.',
      timestamp: '10:14 AM',
      encrypted: true,
    },
    {
      id: 'm2',
      sender: 'Merchant Astrid',
      role: 'Solaris Guild Overseer',
      faction: 'solaris',
      content: 'Aether Crystal market volume reaching all-time highs today! Escrow contracts cleared.',
      timestamp: '10:22 AM',
      encrypted: false,
    },
    {
      id: 'm3',
      sender: 'Alchemist Vael',
      role: 'Void Researcher',
      faction: 'void',
      content: 'Lightning strikes during storms charge our crystal batteries by 25%. Stay alert.',
      timestamp: '10:31 AM',
      encrypted: true,
    },
  ]);

  const [claimedDays, setClaimedDays] = useState<number[]>([1, 2]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: TraderMessage = {
      id: `m_${Date.now()}`,
      sender: 'Player (You)',
      role: 'Aetherian Knight',
      faction: 'vanguard',
      content: chatInput.trim(),
      timestamp: 'Just now',
      encrypted: true,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    sounds.playRadioBeep();
  };

  const loginRewards = [
    { day: 1, reward: '100 Gold', icon: '🪙', claimed: true },
    { day: 2, reward: '25 Oak Wood', icon: '🪵', claimed: true },
    { day: 3, reward: '15 Aether Crystals', icon: '💎', claimed: false },
    { day: 4, reward: '50 Iron Ore', icon: '⛏️', claimed: false },
    { day: 5, reward: '250 Gold', icon: '💰', claimed: false },
    { day: 6, reward: 'Masterwork Pickaxe', icon: '✨', claimed: false },
    { day: 7, reward: 'Dragon Crest Cloak', icon: '👑', claimed: false },
  ];

  const leaderboard = [
    { rank: 1, name: 'Vanguard_General_Rex', score: '48,200', tier: 'Grandmaster' },
    { rank: 2, name: 'Solaris_Tycoon_Elena', score: '42,950', tier: 'Master' },
    { rank: 3, name: 'Void_Seeker_Kael', score: '39,120', tier: 'Diamond' },
    { rank: 4, name: 'Aether_Pioneer_You', score: '12,450', tier: 'Platinum' },
    { rank: 5, name: 'Iron_Mason_Goran', score: '9,800', tier: 'Gold' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/75 pointer-events-auto select-none backdrop-blur-none">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide text-white">
                COMMUNITY, QUESTS & ENCRYPTED CHAT
              </h1>
              <div className="text-xs text-slate-400">
                Daily reward streaks, trader radio comms, and competitive tiers
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/30 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('quests');
              sounds.playButtonClick();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'quests' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Quests
          </button>

          <button
            onClick={() => {
              setActiveTab('calendar');
              sounds.playButtonClick();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'calendar' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7-Day Rewards
          </button>

          <button
            onClick={() => {
              setActiveTab('chat');
              sounds.playButtonClick();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'chat' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Encrypted Comms
          </button>

          <button
            onClick={() => {
              setActiveTab('referrals');
              sounds.playButtonClick();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'referrals' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tier Leaderboards
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {activeTab === 'quests' && (
            <div className="space-y-3">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">{q.title}</div>
                    <div className="text-[11px] text-slate-400">{q.description}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400">
                      <span>Reward: +{q.rewardGold} Gold</span>
                      <span>·</span>
                      <span className="text-cyan-400">+{q.rewardCrystals} Crystals</span>
                      <span>·</span>
                      <span className="text-emerald-400">+{q.rewardXp} XP</span>
                    </div>
                  </div>

                  {q.claimed ? (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CLAIMED</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onClaimQuest(q.id);
                        sounds.playLevelUp();
                      }}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-md"
                    >
                      Complete & Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-medium">
                Log in daily to claim escalating milestone rewards. Streak resets if inactive for over 48 hours.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {loginRewards.map((item) => {
                  const isClaimed = claimedDays.includes(item.day);
                  const isToday = item.day === 3;

                  return (
                    <div
                      key={item.day}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center space-y-2 ${
                        isClaimed
                          ? 'border-emerald-500/40 bg-emerald-950/20 text-slate-200'
                          : isToday
                          ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400 text-white'
                          : 'border-slate-800 bg-slate-900/40 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold">DAY {item.day}</div>
                      <div className="text-2xl">{item.icon}</div>
                      <div className="text-[10px] font-bold">{item.reward}</div>

                      {isClaimed ? (
                        <div className="text-[9px] font-bold text-emerald-400">CLAIMED</div>
                      ) : isToday ? (
                        <button
                          onClick={() => {
                            setClaimedDays((prev) => [...prev, item.day]);
                            sounds.playTradeChime();
                          }}
                          className="px-2 py-1 rounded bg-amber-500 text-slate-950 text-[10px] font-black cursor-pointer shadow"
                        >
                          CLAIM
                        </button>
                      ) : (
                        <div className="text-[9px] text-slate-600">LOCKED</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>256-Bit P2P Encrypted Military Radio Channel</span>
                </div>
                <span className="font-mono text-emerald-400 text-[10px]">DIRECT SYNC</span>
              </div>

              {/* Message List */}
              <div className="h-64 overflow-y-auto space-y-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800 font-sans">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">{msg.sender}</span>
                        <span className="text-[10px] text-slate-500 font-mono">[{msg.role}]</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Send encrypted comm to realm channels..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Your Pioneer Referral Code</div>
                  <div className="text-[11px] text-slate-400">Invite allies to receive 15% trade fee rebates</div>
                </div>
                <div className="font-mono font-black text-amber-400 text-sm px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  AETH-7749-VANGUARD
                </div>
              </div>

              {/* Tier Rankings */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Global Realm Leaderboard</span>
                </div>

                <div className="space-y-1.5">
                  {leaderboard.map((u) => (
                    <div
                      key={u.rank}
                      className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 font-mono font-black text-amber-400">#{u.rank}</span>
                        <span className="font-bold text-white">{u.name}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-400 text-[11px]">{u.tier}</span>
                        <span className="text-amber-400 font-bold tabular-nums">{u.score} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
