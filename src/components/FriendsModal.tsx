import React, { useState, useEffect } from 'react';
import { EnrichedFriend, UserProfileRecord } from '../types';
import { AccountProfile } from '../utils/account';
import {
  Users,
  UserPlus,
  X,
  Play,
  Send,
  Check,
  Trash2,
  Clock,
  Radio,
  Search,
  Sparkles,
  Flame,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountProfile;
  activeRoomCode?: string | null;
  onJoinRoom: (roomCode: string) => void;
  onInviteFriend?: (friendId: string, roomCode: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  account,
  activeRoomCode,
  onJoinRoom,
  onInviteFriend,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'requests'>('list');
  const [friends, setFriends] = useState<EnrichedFriend[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<UserProfileRecord[]>([]);
  const [requestsSent, setRequestsSent] = useState<UserProfileRecord[]>([]);
  const [suggestedPlayers, setSuggestedPlayers] = useState<UserProfileRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  const fetchFriendsData = () => {
    setIsLoading(true);
    fetch(`/api/friends/${account.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.friends) setFriends(data.friends);
        if (data?.requestsReceived) setRequestsReceived(data.requestsReceived);
        if (data?.requestsSent) setRequestsSent(data.requestsSent);
      })
      .catch((err) => console.warn('Could not fetch friends:', err))
      .finally(() => setIsLoading(false));

    fetch(`/api/players/discover?userId=${account.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.players) setSuggestedPlayers(data.players);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriendsData();
      setActionNotice(null);
    }
  }, [isOpen, account.id]);

  if (!isOpen) return null;

  const handleSendRequest = (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        targetQuery: targetQuery.trim(),
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setActionNotice(`Friend request sent to ${res.friend?.name || targetQuery}!`);
          setSearchQuery('');
          fetchFriendsData();
        } else {
          setActionNotice(res.error || 'Failed to send friend request');
        }
      })
      .catch(() => setActionNotice('Network error sending request'));
  };

  const handleAcceptRequest = (requesterId: string) => {
    fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        requesterId,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setActionNotice('Friend request accepted!');
          fetchFriendsData();
        }
      })
      .catch(() => {});
  };

  const handleDeclineRequest = (requesterId: string) => {
    fetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        requesterId,
      }),
    })
      .then(() => fetchFriendsData())
      .catch(() => {});
  };

  const handleRemoveFriend = (friendId: string) => {
    fetch('/api/friends/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: account.id,
        friendId,
      }),
    })
      .then(() => fetchFriendsData())
      .catch(() => {});
  };

  const handleInviteToRoom = (friendId: string) => {
    if (!activeRoomCode || !onInviteFriend) return;
    onInviteFriend(friendId, activeRoomCode);
    setInvitedFriends((prev) => new Set(prev).add(friendId));
    setActionNotice('Game invite sent!');
    setTimeout(() => {
      setInvitedFriends((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }, 5000);
  };

  const formatLastSeen = (timestamp: number) => {
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Friends & Social</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-bold">
                  {friends.length} Friends
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Join friends directly or invite them to your active lobby
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'list'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'add'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Add Friend
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Requests</span>
            {requestsReceived.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {requestsReceived.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold flex items-center justify-between animate-fade-in">
            <span>{actionNotice}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3 text-2xl">
                    👥
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">No Friends Yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto mb-4">
                    Add fellow UNO players by their handle or player ID to jump directly into matches together!
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
                  >
                    Find Players
                  </button>
                </div>
              ) : (
                friends.map((friend) => {
                  const isPlaying = friend.presence === 'in_game' && !!friend.currentRoomCode;
                  const isOnline = friend.presence === 'online' || isPlaying;

                  return (
                    <div
                      key={friend.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                            {friend.avatar}
                          </div>
                          {/* Presence Dot */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                              isPlaying
                                ? 'bg-purple-500 animate-pulse'
                                : isOnline
                                ? 'bg-emerald-400'
                                : 'bg-slate-600'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{friend.name}</span>
                            {friend.stats.gamesWon > 0 && (
                              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-0.5">
                                🏆{friend.stats.gamesWon}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            {isPlaying ? (
                              <span className="text-purple-400 font-bold flex items-center gap-1">
                                <span>Playing in room</span>
                                <span className="font-mono bg-purple-500/20 px-1 rounded text-purple-300">
                                  {friend.currentRoomCode}
                                </span>
                              </span>
                            ) : isOnline ? (
                              <span className="text-emerald-400">Online in Lobby</span>
                            ) : (
                              <span>Seen {formatLastSeen(friend.lastSeen)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* If friend is playing in a room, 1-Click Join Match! */}
                        {isPlaying && friend.currentRoomCode && (
                          <button
                            onClick={() => {
                              onJoinRoom(friend.currentRoomCode!);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                            title="Join friend's active match without typing code!"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Join Match</span>
                          </button>
                        )}

                        {/* If user is in an active room and friend is online/not in same room, Invite */}
                        {activeRoomCode && isOnline && !isPlaying && onInviteFriend && (
                          <button
                            onClick={() => handleInviteToRoom(friend.id)}
                            disabled={invitedFriends.has(friend.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all ${
                              invitedFriends.has(friend.id)
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
                            }`}
                          >
                            {invitedFriends.has(friend.id) ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Sent</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Invite</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Remove Friend */}
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: ADD FRIEND & DISCOVER */}
          {activeTab === 'add' && (
            <div className="space-y-5">
              {/* Search / Add Box */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Add Friend by Name or Player ID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter Player Name or acc_..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400 text-xs font-bold"
                    />
                  </div>
                  <button
                    onClick={() => handleSendRequest(searchQuery)}
                    disabled={!searchQuery.trim()}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                      searchQuery.trim()
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 cursor-pointer active:scale-95'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>

              {/* Suggested Players from Server */}
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Discover Active UNO Players</span>
                </div>

                <div className="space-y-2">
                  {suggestedPlayers.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                      No other players on server right now. Share your Friend ID!
                    </div>
                  ) : (
                    suggestedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            {player.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {player.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {player.id}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSendRequest(player.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-5">
              {/* Received Requests */}
              <div>
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span>Incoming Requests</span>
                  {requestsReceived.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                      {requestsReceived.length}
                    </span>
                  )}
                </h3>

                {requestsReceived.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 italic">
                    No pending incoming requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {requestsReceived.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            {req.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {req.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Wants to be friends
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                  Sent Requests ({requestsSent.length})
                </h3>

                {requestsSent.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 italic">
                    No outgoing friend requests pending.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {requestsSent.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            {req.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-300 truncate">
                              {req.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Pending response...
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
