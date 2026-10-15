/**
 * Global ELO Rating & Seasonal Leaderboard Modal
 *
 * Implements:
 * - Dynamic K-Factor ELO Tiers (Bronze, Silver, Gold, Grandmaster)
 * - Monthly Season countdown & 500 USDT seasonal prize pool
 * - Top 50 Global Leaderboard with win rates, streaks, and tier badges
 */

import React, { useState, useEffect } from 'react';
import { RoyalCrownIcon } from './RoyalIcons';

interface LeaderboardUser {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Grandmaster';
  level: number;
  wins: number;
  losses: number;
  winRate: number;
  matchesPlayed: number;
  winStreak: number;
  rewardUsdt?: number;
}

interface SeasonData {
  seasonId: number;
  name: string;
  persianName: string;
  prizePoolUsdt: number;
  daysRemaining: number;
}

interface LeaderboardSeasonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    username: string;
    rating: number;
    level: number;
    wins: number;
    losses: number;
  };
}

export function LeaderboardSeasonsModal({
  isOpen,
  onClose,
  currentUser,
}: LeaderboardSeasonsModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [season, setSeason] = useState<SeasonData>({
    seasonId: 1,
    name: 'Season I: Imperial Dawn',
    persianName: 'فصل اول: پگاه شاهنشاهی',
    prizePoolUsdt: 500,
    daysRemaining: 20,
  });

  useEffect(() => {
    if (isOpen) {
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.season) setSeason(data.season);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Grandmaster':
        return '#c084fc';
      case 'Gold':
        return '#e5c158';
      case 'Silver':
        return '#c0c0c0';
      default:
        return '#cd7f32';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-[700px] max-h-[92vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 sm:p-5 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <RoyalCrownIcon className="w-5 h-5 text-[#f5dca8]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.16em] text-[#f5dca8] uppercase">
                  GLOBAL ELO LEADERBOARD &amp; SEASONS
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-[#0b291d] border border-[#52f29c]/40 font-cinzel text-[7px] text-[#52f29c] font-bold">
                  {season.daysRemaining} DAYS LEFT
                </span>
              </div>
              <p className="font-cormorant text-[10px] text-[#a39e93]">
                {season.persianName} • رتبه‌بندی جهانی، پاداش‌های فصلی و ضرایب K داینامیک
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Dynamic K-Factor Tiers Bar */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-[#020a06] border border-[#c8a668]/30 mb-3 shrink-0 text-center text-[7.5px] font-cinzel">
          <div className="p-1 rounded bg-[#2e1d10]/40 border border-[#cd7f32]/30">
            <span className="text-[#cd7f32] font-bold block">BRONZE</span>
            <span className="text-[#8e8a80] text-[6.5px]">&lt; 1300 • K=40</span>
          </div>
          <div className="p-1 rounded bg-[#1c242b]/40 border border-[#c0c0c0]/30">
            <span className="text-[#c0c0c0] font-bold block">SILVER</span>
            <span className="text-[#8e8a80] text-[6.5px]">1300-1599 • K=32</span>
          </div>
          <div className="p-1 rounded bg-[#2b220d]/40 border border-[#e5c158]/30">
            <span className="text-[#e5c158] font-bold block">GOLD</span>
            <span className="text-[#8e8a80] text-[6.5px]">1600-1899 • K=24</span>
          </div>
          <div className="p-1 rounded bg-[#1f102e]/40 border border-[#c084fc]/30">
            <span className="text-[#c084fc] font-bold block">GRANDMASTER</span>
            <span className="text-[#8e8a80] text-[6.5px]">1900+ • K=16</span>
          </div>
        </div>

        {/* User Card Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b291d] border border-[#52f29c]/40 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#140e05] border border-[#f5dca8] flex items-center justify-center font-cinzel text-xs font-bold text-[#f5dca8]">
              {currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="font-cinzel text-[9.5px] font-bold text-white block">
                {currentUser.username} (YOU)
              </span>
              <span className="text-[8px] font-cormorant text-[#a39e93]">
                Level {currentUser.level} • {currentUser.wins} Wins • {currentUser.losses} Losses
              </span>
            </div>
          </div>
          <div className="text-right font-cinzel">
            <span className="text-[7.5px] text-[#8e8a80] block">YOUR GLOBAL ELO</span>
            <span className="text-sm font-bold text-[#ffe4a0] tabular-nums">
              {currentUser.rating} PTS
            </span>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-[#c8a668]/30 bg-[#020a06]/80 pr-1">
          <table className="w-full text-left border-collapse text-[8.5px]">
            <thead>
              <tr className="border-b border-[#c8a668]/30 bg-[#061911] font-cinzel text-[#c8a668] sticky top-0">
                <th className="p-2">#</th>
                <th className="p-2">PLAYER</th>
                <th className="p-2">RATING</th>
                <th className="p-2">TIER</th>
                <th className="p-2">W / L</th>
                <th className="p-2">WIN RATE</th>
                <th className="p-2">REWARD (USDT)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((u) => {
                const isMe = u.userId === currentUser.id;
                return (
                  <tr
                    key={u.userId}
                    className={`border-b border-white/5 transition-colors ${
                      isMe ? 'bg-[#0f2e20] text-white font-bold' : 'hover:bg-[#061911]/60'
                    }`}
                  >
                    <td className="p-2 font-cinzel font-bold tabular-nums">
                      {u.rank === 1 ? '🥇 1' : u.rank === 2 ? '🥈 2' : u.rank === 3 ? '🥉 3' : u.rank}
                    </td>
                    <td className="p-2">
                      <span className="text-[#f5dca8] font-medium">{u.username}</span>
                      {isMe && <span className="ml-1 text-[7px] text-[#52f29c]">(YOU)</span>}
                    </td>
                    <td className="p-2 font-cinzel font-bold tabular-nums text-white">
                      {u.rating}
                    </td>
                    <td className="p-2 font-cinzel">
                      <span
                        className="px-1.5 py-0.5 rounded text-[7px] font-bold border"
                        style={{
                          color: getTierColor(u.tier),
                          borderColor: `${getTierColor(u.tier)}50`,
                          backgroundColor: `${getTierColor(u.tier)}15`,
                        }}
                      >
                        {u.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 font-cinzel tabular-nums text-[#a39e93]">
                      {u.wins}W - {u.losses}L
                    </td>
                    <td className="p-2 font-cinzel tabular-nums text-[#52f29c]">
                      {u.winRate}%
                    </td>
                    <td className="p-2 font-cinzel tabular-nums font-bold text-[#ffe4a0]">
                      {u.rewardUsdt ? `+${u.rewardUsdt} USDT` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
