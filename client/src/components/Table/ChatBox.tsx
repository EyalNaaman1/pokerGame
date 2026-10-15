import { MessageSquare, Send, Smile } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../../../shared/types.js';
import { socketService } from '../../services/socket.js';
import { sound } from '../../services/sound.js';

interface ChatBoxProps {
  tableId: string;
  messages: ChatMessage[];
}

const QUICK_MESSAGES = ['Nice hand! 👏', 'Good luck! 🍀', 'GG! 🏆', 'Unbelievable! 🤯', 'All In! 🚀'];

export const ChatBox: React.FC<ChatBoxProps> = ({ tableId, messages }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (text?: string) => {
    const msg = text || inputMessage;
    if (msg.trim()) {
      sound.playButtonClick();
      socketService.sendChat(tableId, msg.trim());
      setInputMessage('');
    }
  };

  return (
    <div className="relative">
      {/* Chat Toggle Button */}
      <button
        onClick={() => {
          sound.playButtonClick();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 shadow-xl backdrop-blur-md transition active:scale-95"
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
        <span>Chat {messages.length > 0 && `(${messages.length})`}</span>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-80 max-w-[90vw] h-80 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Table Live Chat</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {messages.length === 0 ? (
              <p className="text-slate-500 italic text-center py-4">
                No chat messages yet. Say hello!
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="leading-tight">
                  <span className="text-slate-500 text-[10px] mr-1.5">{m.time}</span>
                  <span className="font-bold text-amber-400 mr-1.5">{m.sender}:</span>
                  <span className="text-slate-200">{m.message}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reactions */}
          <div className="px-2 py-1.5 bg-slate-900/40 border-t border-slate-800/80 flex items-center gap-1 overflow-x-auto">
            {QUICK_MESSAGES.map((q, idx) => (
              <button
                key={`quick-${idx}`}
                onClick={() => handleSend(q)}
                className="shrink-0 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type message..."
              maxLength={80}
              className="flex-1 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
