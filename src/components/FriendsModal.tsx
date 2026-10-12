import React, { useState } from 'react';
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
  onChallengeFriend: (targetUserId: string) => void;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[460px] max-h-[88vh] rounded-lg border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 shadow-2xl flex flex-col text-[#e8dfd0]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-2.5 mb-3">
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
        <div className="grid grid-cols-3 gap-1 mb-3 bg-[#020906] p-1 rounded border border-[#c8a668]/20">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`py-1 rounded font-cinzel text-[8.5px] font-medium tracking-wider transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-[#0a271b] border border-[#c8a668]/50 text-[#f5dca8]'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            FRIENDS ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`py-1 rounded font-cinzel text-[8.5px] font-medium tracking-wider transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-[#0a271b] border border-[#c8a668]/50 text-[#f5dca8]'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            SEARCH PLAYERS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-1 rounded font-cinzel text-[8.5px] font-medium tracking-wider transition-all cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-[#0a271b] border border-[#c8a668]/50 text-[#f5dca8]'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            REQUESTS {incomingRequests.length > 0 && `(${incomingRequests.length})`}
            {incomingRequests.length > 0 && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f7d774] ml-1 align-middle" />
            )}
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto min-h-[180px] max-h-[260px] pr-1">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-cinzel text-[10px] text-[#a39e93] mb-1">
                    NO FRIENDS ADDED YET
                  </p>
                  <p className="font-cormorant text-[10px] text-[#78746c]">
                    Use the "Search Players" tab to find and add real opponents by name!
                  </p>
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2 rounded border border-[#c8a668]/25 bg-[#061810]/70 hover:border-[#c8a668]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Online Status Indicator */}
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full border border-[#c8a668]/50 bg-[#020a06] flex items-center justify-center font-cinzel text-[10px] font-bold text-[#f5dca8]">
                          {f.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          title={f.status}
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#020a06] ${
                            f.status === 'online'
                              ? 'bg-[#52f29c]'
                              : f.status === 'in_game'
                              ? 'bg-[#f7d774]'
                              : 'bg-[#55524c]'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-cinzel text-[9.5px] font-semibold text-[#f5dca8]">
                            {f.username}
                          </span>
                          <span className="text-[7.5px] font-cinzel px-1 py-0.2 rounded bg-[#092217] text-[#52f29c] border border-[#52f29c]/30">
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
                      disabled={f.status !== 'online'}
                      onClick={() => onChallengeFriend(f.id)}
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
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#020b07] border border-[#c8a668]/40 font-cinzel text-[9px] text-[#f5dca8] placeholder-[#6e6a60] focus:outline-none focus:border-[#f5dca8]"
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
                        className="flex items-center justify-between p-2 rounded border border-[#c8a668]/25 bg-[#061810]/70"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border border-[#c8a668]/40 bg-[#020a06] flex items-center justify-center font-cinzel text-[9px] text-[#f5dca8]">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-cinzel text-[9px] font-semibold text-[#f5dca8]">
                                {u.username}
                              </span>
                              <span className="text-[7.5px] font-cinzel px-1 py-0.2 rounded bg-[#092217] text-[#52f29c] border border-[#52f29c]/30">
                                LVL {u.level}
                              </span>
                            </div>
                            <span className="font-cormorant text-[8px] text-[#8e8a80]">
                              {u.wins} Wins • {u.status}
                            </span>
                          </div>
                        </div>

                        {isAlreadyFriend ? (
                          <span className="font-cinzel text-[7.5px] text-[#52f29c] font-semibold tracking-wider">
                            FRIEND ✓
                          </span>
                        ) : isRequested ? (
                          <span className="font-cinzel text-[7.5px] text-[#f7d774] font-semibold tracking-wider">
                            PENDING...
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendRequest(u.id)}
                            className="px-2 py-0.8 rounded bg-[#0a271b] hover:bg-[#113a29] border border-[#c8a668]/50 font-cinzel text-[7.5px] font-semibold text-[#f5dca8] cursor-pointer"
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
                        className="flex items-center justify-between p-2 rounded border border-[#f7d774]/40 bg-[#072015]"
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
                            className="px-2 py-0.8 rounded bg-[#104229] hover:bg-[#185938] border border-[#52f29c]/60 font-cinzel text-[7.5px] font-semibold text-[#52f29c] cursor-pointer"
                          >
                            ACCEPT
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectFriendRequest(req.id)}
                            className="px-2 py-0.8 rounded bg-[#200a06] hover:bg-[#33110a] border border-[#d66852]/50 font-cinzel text-[7.5px] font-semibold text-[#e89080] cursor-pointer"
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
                        <span className="text-[#f7d774] font-cinzel text-[7.5px]">AWAITING APPROVAL</span>
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
