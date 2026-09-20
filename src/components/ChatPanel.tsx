import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Send, MessageSquare, X, Sparkles, Shield, Eye, Lock } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  myPlayerId: string;
  isSpectator?: boolean;
  unreadCount: number;
  roomCode?: string;
  roomId?: string;
}

const QUICK_CHATS = [
  'Good luck! 🍀',
  'Watch out! 🔥',
  'UNO! ⚡',
  'Nice counter! 🛡️',
  'Please no +4! 😭',
  'GG! 🏆',
  'Speed up! ⏱️',
  'Great move! 👏',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onToggle,
  messages,
  onSendMessage,
  myPlayerId,
  isSpectator = false,
  unreadCount,
  roomCode,
  roomId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to latest message when panel is open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText('');
  };

  const handleQuickChat = (text: string) => {
    onSendMessage(text);
  };

  return (
    <>
      {/* Floating Toggle Button (Always visible on bottom-right) */}
      <button
        id="chat-toggle-button"
        onClick={onToggle}
        className={`
          fixed bottom-4 right-4 z-40 p-3.5 rounded-2xl flex items-center gap-2 shadow-2xl transition-all duration-200 active:scale-95
          ${isOpen
            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
            : 'bg-slate-900/95 hover:bg-slate-800 text-white border-2 border-slate-700/80 shadow-black/60'}
        `}
        title="Open Live Chat"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 fill-current" />
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 px-1.5 py-0.5 min-w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-black tracking-wide hidden sm:inline">
          {isOpen ? 'Close Chat' : 'Live Chat'}
        </span>
        {isSpectator && !isOpen && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
            Spec
          </span>
        )}
      </button>

      {/* Slide-in Chat Drawer */}
      {isOpen && (
        <div
          id="chat-panel-container"
          className="fixed bottom-20 right-4 z-40 w-[calc(100vw-2rem)] sm:w-96 max-h-[540px] h-[75vh] flex flex-col bg-slate-900/95 border-2 border-amber-500/30 rounded-3xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70 rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>Lobby Chat</span>
                  {roomCode && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black tracking-wider">
                      {roomCode}
                    </span>
                  )}
                  {isSpectator && (
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" /> Spec
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Private to Lobby {roomCode || ''} & players</span>
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Chat Chips */}
          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_CHATS.map((qc) => (
              <button
                key={qc}
                onClick={() => handleQuickChat(qc)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold whitespace-nowrap transition-colors active:scale-95 shrink-0 border border-slate-700/60 hover:border-amber-500/40"
              >
                {qc}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-slate-300">Private Lobby Chat</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[230px]">
                  Messages sent here are strictly private to players and spectators in this lobby.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myPlayerId;
                const isSystem = msg.isSystem;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex items-center justify-center my-1.5">
                      <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-amber-300/90 text-[11px] font-medium flex items-center gap-1.5 shadow-sm text-center">
                        <span>{msg.senderAvatar}</span>
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-medium">
                      <span className="text-xs">{msg.senderAvatar}</span>
                      <span className={`font-bold ${isMe ? 'text-amber-400' : 'text-slate-300'}`}>
                        {msg.senderName}
                      </span>
                      {msg.isSpectator && (
                        <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                          👁️ Spectator
                        </span>
                      )}
                      <span className="text-slate-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`
                        px-3.5 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-md
                        ${isMe
                          ? 'bg-amber-500 text-slate-950 rounded-tr-xs font-medium'
                          : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/80'}
                      `}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/80 rounded-b-3xl">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={140}
                placeholder={isSpectator ? 'Chat as spectator...' : 'Send message to table...'}
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:outline-hidden focus:border-amber-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`
                  absolute right-1.5 p-1.5 rounded-lg transition-all
                  ${inputText.trim()
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'}
                `}
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] text-slate-500">
              <span>Enter to send</span>
              <span>{inputText.length}/140</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
