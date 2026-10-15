import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, TableState, TableSummary, UserProfile } from '../../shared/types.js';
import { ProfileModal } from './components/Common/ProfileModal.js';
import { LobbyView } from './components/Lobby/LobbyView.js';
import { Navbar } from './components/Navbar.js';
import { PokerTable } from './components/Table/PokerTable.js';
import { socketService } from './services/socket.js';
import { sound } from './services/sound.js';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [currentTableState, setCurrentTableState] = useState<TableState | null>(null);
  const [view, setView] = useState<'LOBBY' | 'TABLE'>('LOBBY');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if user has an existing saved name
  const [showProfileModal, setShowProfileModal] = useState<boolean>(
    !localStorage.getItem('poker_user_name')
  );

  const prevStageRef = useRef<string | null>(null);
  const initialRoomCodeRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if opened via invite link ?room=CODE or ?code=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('room') || urlParams.get('code');
    if (code) {
      initialRoomCodeRef.current = code.trim().toUpperCase();
    }

    const socket = socketService.init();

    socket.on('user_profile', (profile: UserProfile) => {
      setUser(profile);
      // If invited via link and name is already configured, auto-join room
      if (initialRoomCodeRef.current && localStorage.getItem('poker_user_name')) {
        socketService.joinRoomByCode(initialRoomCodeRef.current);
        setView('TABLE');
        initialRoomCodeRef.current = null;
      }
    });

    socket.on('table_list', (list: TableSummary[]) => {
      setTables(list);
    });

    socket.on('room_created', () => {
      setView('TABLE');
      setChatMessages([]);
    });

    socket.on('table_state', (state: TableState) => {
      setCurrentTableState(state);

      // Play sound cues on community card dealing
      if (prevStageRef.current !== state.stage) {
        if (state.stage === 'FLOP' || state.stage === 'TURN' || state.stage === 'RIVER' || state.stage === 'PREFLOP') {
          sound.playCardSound();
        }
        prevStageRef.current = state.stage;
      }
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-40), msg]);
    });

    socket.on('action_result', (res: { success: boolean; error?: string }) => {
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 3500);
      }
    });

    return () => {
      socket.off('user_profile');
      socket.off('table_list');
      socket.off('room_created');
      socket.off('table_state');
      socket.off('chat_message');
      socket.off('action_result');
    };
  }, []);

  const handleSelectTable = (tableId: string, buyIn: number) => {
    socketService.joinTable(tableId, buyIn);
    setView('TABLE');
    setChatMessages([]);
  };

  const handleLeaveTable = () => {
    if (currentTableState) {
      socketService.leaveTable(currentTableState.id);
    }
    setCurrentTableState(null);
    setView('LOBBY');
    socketService.getTables();
  };

  const handleProfileSaved = (name: string, avatar: string) => {
    setShowProfileModal(false);
    // If entered via invite link, join immediately after setting name
    if (initialRoomCodeRef.current) {
      socketService.joinRoomByCode(initialRoomCodeRef.current);
      setView('TABLE');
      initialRoomCodeRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-['Outfit'] select-none">
      {/* Top Navigation */}
      <Navbar
        user={user}
        currentTableTitle={view === 'TABLE' && currentTableState ? currentTableState.name : undefined}
        onBackToLobby={view === 'TABLE' ? handleLeaveTable : undefined}
      />

      {/* Error Toast Notification */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-600/90 border border-rose-400 text-white font-black text-xs px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md animate-bounce">
          {errorMessage}
        </div>
      )}

      {/* Main Content View */}
      <main className="flex-1 flex flex-col">
        {view === 'LOBBY' || !currentTableState ? (
          <LobbyView
            tables={tables}
            user={user}
            onSelectTable={handleSelectTable}
            onOpenProfile={() => setShowProfileModal(true)}
          />
        ) : (
          <PokerTable
            tableState={currentTableState}
            user={user}
            onLeaveTable={handleLeaveTable}
            chatMessages={chatMessages}
          />
        )}
      </main>

      {/* Profile Onboarding & Edit Modal */}
      {showProfileModal && (
        <ProfileModal
          initialName={user?.name || ''}
          initialAvatar={user?.avatar || 'avatar1'}
          onClose={handleProfileSaved}
          isFirstTime={!localStorage.getItem('poker_user_name')}
        />
      )}
    </div>
  );
};
export default App;
