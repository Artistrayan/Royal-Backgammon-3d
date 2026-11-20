import React, { useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import { OnlineUser, FriendRequest } from '../network/multiplayerTypes';
import { RoyalCrownIcon } from './RoyalIcons';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: OnlineUser[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  searchResults: OnlineUser[];
  onSearchUsers: (query: string) => void;
  onSendFriendRequest: (targetUserId: string) => void;
  onAcceptFriendRequest: (requestId: string) => void;
  onRejectFriendRequest: (requestId: string) => void;
  onChallengeFriend: (targetUserId: string, amountUsdt: number) => void;
}

export function FriendsModal({
  isOpen,
  onClose,
  friends,
  incomingRequests,
  outgoingRequests,
  searchResults,
  onSearchUsers,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onChallengeFriend,
}: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [challengeAmount, setChallengeAmount] = useState('0');
  const parsedChallengeAmount = Number(challengeAmount);
  const validChallengeAmount = challengeAmount.trim() !== '' && Number.isFinite(parsedChallengeAmount) && parsedChallengeAmount >= 0;

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchUsers(searchQuery.trim());
    }
  };

  const handleSendRequest = (targetUserId: string) => {
    onSendFriendRequest(targetUserId);
    setSentMap((prev) => ({ ...prev, [targetUserId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 bg-[#020611]/55 sm:items-center sm:p-4 backdrop-blur-[2px] animate-fade-in">
      <img src={palaceNightStageBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-85" />
      <div className="pointer-events-none absolute inset-0 bg-[#020611]/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(203,161,75,.18),transparent_55%)]" />
      <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col rounded-none border-0 bg-[linear-gradient(180deg,rgba(8,17,31,.78),rgba(3,8,18,.58))] p-4 text-[#e8dfd0] shadow-[0_24px_90px_rgba(0,0,0,.55)] backdrop-blur-md overflow-hidden sm:h-[min(94dvh,920px)] sm:max-h-[94dvh] sm:max-w-[min(96vw,760px)] sm:rounded-[26px] sm:border sm:border-[#d7b66d]/55 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d7b66d]/45 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <RoyalCrownIcon className="w-4 h-3.5 text-[#c8a668]" />
            <div>
              <h2 className="font-cinzel text-[11px] font-semibold tracking-[0.18em] text-[#f5dca8] uppercase">
                ONLINE FRIENDS & CHALLENGES
              </h2>
              <p className="font-cormorant text-[10px] text-[#a39e93]">
                Strictly online multiplayer • Real opponents only
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-4 rounded-2xl border border-[#d7b66d]/40 bg-[#07101d]/80 p-1.5 shadow-[0_10px_25px_rgba(0,0,0,.35)]">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`py-3 rounded-xl font-cinzel text-[9px] font-semibold tracking-[.12em] transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-[linear-gradient(180deg,#806034,#302316)] border border-[#e5c77f] text-[#fff0c7] shadow-[inset_0_1px_0_rgba(255,235,190,.3),0_4px_12px_rgba(0,0,0,.35)]'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            FRIENDS ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`py-3 rounded-xl font-cinzel text-[9px] font-semibold tracking-[.12em] transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-[linear-gradient(180deg,#806034,#302316)] border border-[#e5c77f] text-[#fff0c7] shadow-[inset_0_1px_0_rgba(255,235,190,.3),0_4px_12px_rgba(0,0,0,.35)]'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            SEARCH PLAYERS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-3 rounded-xl font-cinzel text-[9px] font-semibold tracking-[.12em] transition-all cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-[linear-gradient(180deg,#806034,#302316)] border border-[#e5c77f] text-[#fff0c7] shadow-[inset_0_1px_0_rgba(255,235,190,.3),0_4px_12px_rgba(0,0,0,.35)]'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            REQUESTS {incomingRequests.length > 0 && `(${incomingRequests.length})`}
            {incomingRequests.length > 0 && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e7c879] ml-1 align-middle" />
            )}
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto min-h-[180px] max-h-none pr-1">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div className="space-y-2">
              <div className="rounded border border-[#c8a668]/35 bg-[#060d18]/80 p-2.5">
                <label htmlFor="friend-challenge-amount" className="block font-cinzel text-[8.5px] tracking-wider text-[#f5dca8] mb-1.5">
                  MATCH AMOUNT (USDT) • 0 = FREE
                </label>
                <input id="friend-challenge-amount" type="number" min="0" step="0.01" inputMode="decimal" value={challengeAmount} onChange={(e) => setChallengeAmount(e.target.value)} className="w-full rounded bg-[#0d192b] border border-[#c8a668]/45 px-2.5 py-2 font-cinzel text-[11px] text-[#f5dca8] focus:outline-none focus:border-[#f5dca8]" aria-describedby="friend-challenge-amount-note" />
                <p id="friend-challenge-amount-note" className="font-cormorant text-[10px] text-[#a39e93] mt-1.5">Free matches can start now. Paid matches are not enabled until secure deposits and stake settlement are implemented.</p>
              </div>
              {friends.length === 0 ? (
                <div className="relative mx-auto mt-5 flex min-h-[300px] max-w-md flex-col items-center justify-center overflow-hidden rounded-[26px] border border-[#d7b66d]/45 bg-[radial-gradient(ellipse_at_50%_35%,rgba(205,165,88,.22),transparent_58%),linear-gradient(145deg,rgba(17,31,48,.9),rgba(4,10,20,.94))] px-6 py-8 text-center shadow-[0_22px_55px_rgba(0,0,0,.48),inset_0_1px_0_rgba(255,230,180,.15)]">
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#e6c77f] to-transparent" />
                  <div className="relative mb-5 flex h-28 w-28 items-center justify-center rounded-full border border-[#d9b96f]/65 bg-[radial-gradient(circle_at_35%_25%,#78603b,#1a1b20_65%,#080d16)] shadow-[0_0_0_8px_rgba(217,185,111,.07),0_18px_34px_rgba(0,0,0,.55)]">
                    <RoyalCrownIcon className="h-12 w-12 text-[#e4c47d] drop-shadow-[0_0_14px_rgba(230,195,120,.45)]" />
                  </div>
                  <h3 className="font-cinzel text-[13px] font-semibold tracking-[.18em] text-[#f5dca8]">YOUR ROYAL TABLE</h3>
                  <p className="mt-2 max-w-[260px] font-cormorant text-[14px] leading-relaxed text-[#c5b99f]">Your friends list is waiting for its first challenger.</p>
                  <button type="button" onClick={() => setActiveTab('search')} className="mt-6 rounded-xl border border-[#ead4a4]/80 bg-[linear-gradient(180deg,#b28a49,#65451f)] px-6 py-3 font-cinzel text-[9px] font-bold tracking-[.16em] text-[#170f06] shadow-[0_8px_20px_rgba(0,0,0,.4)] transition hover:brightness-110 active:scale-[.98]">FIND PLAYERS</button>
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2 rounded border border-[#c8a668]/25 bg-[#0d192b]/70 hover:border-[#c8a668]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Online Status Indicator */}
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full border border-[#c8a668]/50 bg-[#030812] flex items-center justify-center font-cinzel text-[10px] font-bold text-[#f5dca8]">
                          {f.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          title={f.status}
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#030812] ${
                            f.status === 'online'
                              ? 'bg-[#d9b96f]'
                              : f.status === 'in_game'
                              ? 'bg-[#e7c879]'
                              : 'bg-[#55524c]'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-cinzel text-[9.5px] font-semibold text-[#f5dca8]">
                            {f.username}
                          </span>
                          <span className="text-[7.5px] font-cinzel px-1 py-0.2 rounded bg-[#182a43] text-[#d9b96f] border border-[#d9b96f]/30">
                            LVL {f.level}
                          </span>
                        </div>
                        <span className="font-cormorant text-[8.5px] text-[#8e8a80] block">
                          {f.status === 'online'
                            ? 'Ready to Play'
                            : f.status === 'in_game'
                            ? 'Currently in Match'
                            : 'Offline'}
                          {' • '}
                          {f.wins} Wins
                        </span>
                      </div>
                    </div>

                    {/* Challenge Button */}
                    <button
                      type="button"
                      disabled={f.status !== 'online' || !validChallengeAmount}
                      onClick={() => onChallengeFriend(f.id, Math.round(parsedChallengeAmount * 100) / 100)}
                      className={`px-2 py-1 rounded font-cinzel text-[8px] font-semibold tracking-wider transition-all ${
                        f.status === 'online'
                          ? 'brass-button-surface border border-[#ead4a4]/80 text-[#140e05] cursor-pointer active:scale-95'
                          : 'bg-[#040e08] border border-[#c8a668]/10 text-[#55524c] cursor-not-allowed'
                      }`}
                    >
                      CHALLENGE
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SEARCH PLAYERS */}
          {activeTab === 'search' && (
            <div>
              <form onSubmit={handleSearchSubmit} className="flex gap-1.5 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length >= 1) {
                      onSearchUsers(e.target.value.trim());
                    }
                  }}
                  placeholder="Enter username to search..."
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#060d18] border border-[#c8a668]/40 font-cinzel text-[9px] text-[#f5dca8] placeholder-[#6e6a60] focus:outline-none focus:border-[#f5dca8]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded brass-button-surface border border-[#ead4a4]/80 font-cinzel text-[8.5px] font-semibold text-[#140e05] cursor-pointer"
                >
                  SEARCH
                </button>
              </form>

              <div className="space-y-1.5">
                {searchResults.length === 0 ? (
                  <p className="text-center py-6 font-cormorant text-[10px] text-[#78746c]">
                    {searchQuery
                      ? 'No players found with that username'
                      : 'Type a name above to search across all registered players'}
                  </p>
                ) : (
                  searchResults.map((u) => {
                    const isAlreadyFriend = friends.some((f) => f.id === u.id);
                    const isRequested =
                      sentMap[u.id] ||
                      outgoingRequests.some((r) => r.toUserId === u.id);

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded border border-[#c8a668]/25 bg-[#0d192b]/70"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border border-[#c8a668]/40 bg-[#030812] flex items-center justify-center font-cinzel text-[9px] text-[#f5dca8]">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-cinzel text-[9px] font-semibold text-[#f5dca8]">
                                {u.username}
                              </span>
                              <span className="text-[7.5px] font-cinzel px-1 py-0.2 rounded bg-[#182a43] text-[#d9b96f] border border-[#d9b96f]/30">
                                LVL {u.level}
                              </span>
                            </div>
                            <span className="font-cormorant text-[8px] text-[#8e8a80]">
                              {u.wins} Wins • {u.status}
                            </span>
                          </div>
                        </div>

                        {isAlreadyFriend ? (
                          <span className="font-cinzel text-[7.5px] text-[#d9b96f] font-semibold tracking-wider">
                            FRIEND ✓
                          </span>
                        ) : isRequested ? (
                          <span className="font-cinzel text-[7.5px] text-[#e7c879] font-semibold tracking-wider">
                            PENDING...
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendRequest(u.id)}
                            className="px-2 py-0.8 rounded bg-[#172840] hover:bg-[#113a29] border border-[#c8a668]/50 font-cinzel text-[7.5px] font-semibold text-[#f5dca8] cursor-pointer"
                          >
                            + ADD FRIEND
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FRIEND REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              <div>
                <h3 className="font-cinzel text-[8.5px] text-[#c8a668] tracking-widest mb-1.5">
                  INCOMING REQUESTS ({incomingRequests.length})
                </h3>
                {incomingRequests.length === 0 ? (
                  <p className="font-cormorant text-[9.5px] text-[#78746c] italic">
                    No pending requests received
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2 rounded border border-[#e7c879]/40 bg-[#101d31]"
                      >
                        <div>
                          <span className="font-cinzel text-[9px] font-semibold text-[#f5dca8] block">
                            {req.fromUser.username}
                          </span>
                          <span className="font-cormorant text-[8px] text-[#a39e93]">
                            Level {req.fromUser.level} • {req.fromUser.wins} Wins
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAcceptFriendRequest(req.id)}
                            className="px-2 py-0.8 rounded bg-[#243957] hover:bg-[#304766] border border-[#d9b96f]/60 font-cinzel text-[7.5px] font-semibold text-[#d9b96f] cursor-pointer"
                          >
                            ACCEPT
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectFriendRequest(req.id)}
                            className="px-2 py-0.8 rounded bg-[#171b25] hover:bg-[#252b37] border border-[#c89c65]/50 font-cinzel text-[7.5px] font-semibold text-[#e4cfa8] cursor-pointer"
                          >
                            DECLINE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {outgoingRequests.length > 0 && (
                <div>
                  <h3 className="font-cinzel text-[8.5px] text-[#8e8a80] tracking-widest mb-1">
                    PENDING OUTGOING REQUESTS ({outgoingRequests.length})
                  </h3>
                  <div className="space-y-1">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-1.5 rounded bg-[#030d07] border border-[#c8a668]/15 text-[8.5px] font-cormorant text-[#a39e93]"
                      >
                        <span>Friend request sent</span>
                        <span className="text-[#e7c879] font-cinzel text-[7.5px]">AWAITING APPROVAL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
