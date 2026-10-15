import { io, Socket } from 'socket.io-client';
import { PlayerActionType } from '../../../shared/types.js';
import { localPokerEngine } from './localEngine.js';

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('poker_user_id');
  if (stored) return stored;
  const newId = 'user_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('poker_user_id', newId);
  return newId;
}

function getStoredUserName(): string {
  return localStorage.getItem('poker_user_name') || '';
}

function getStoredUserAvatar(): string {
  return localStorage.getItem('poker_user_avatar') || 'avatar1';
}

class SocketService {
  public socket: Socket | null = null;
  public userId: string = getOrCreateUserId();
  public userName: string = getStoredUserName();
  public userAvatar: string = getStoredUserAvatar();

  private usingLocalEngine: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  public init() {
    // If running in production (GitHub Pages) or if no backend server available
    const isGitHubPages = window.location.hostname.includes('github.io');
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

    if (!isGitHubPages && serverUrl) {
      try {
        this.socket = io(serverUrl, {
          query: {
            userId: this.userId,
            name: this.userName || undefined,
            avatar: this.userAvatar,
          },
          transports: ['websocket', 'polling'],
          timeout: 2000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to remote Poker Server:', this.socket?.id);
          this.usingLocalEngine = false;
        });

        this.socket.on('connect_error', () => {
          console.log('Remote server unreachable, falling back to in-browser engine');
          this.fallbackToLocal();
        });
      } catch {
        this.fallbackToLocal();
      }
    } else {
      this.fallbackToLocal();
    }

    // Connect local engine events to dispatch
    localPokerEngine.subscribe((event, payload) => {
      if (this.usingLocalEngine) {
        this.dispatch(event, payload);
      }
    });

    // Initial triggers for local engine
    if (this.usingLocalEngine) {
      setTimeout(() => {
        this.dispatch('user_profile', localPokerEngine.getUserProfile());
        this.dispatch('table_list', localPokerEngine.getAllSummaries());
      }, 50);
    }

    return this;
  }

  private fallbackToLocal() {
    this.usingLocalEngine = true;
    setTimeout(() => {
      this.dispatch('user_profile', localPokerEngine.getUserProfile());
      this.dispatch('table_list', localPokerEngine.getAllSummaries());
    }, 50);
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  public off(event: string, callback?: Function) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  private dispatch(event: string, payload: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const fn of handlers) {
        fn(payload);
      }
    }
  }

  public updateProfile(name: string, avatar?: string) {
    this.userName = name;
    localStorage.setItem('poker_user_name', name);
    if (avatar) {
      this.userAvatar = avatar;
      localStorage.setItem('poker_user_avatar', avatar);
    }

    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.updateProfile(name, avatar);
    } else {
      this.socket.emit('update_profile', { name, avatar });
    }
  }

  public getTables() {
    if (this.usingLocalEngine || !this.socket?.connected) {
      this.dispatch('table_list', localPokerEngine.getAllSummaries());
    } else {
      this.socket.emit('get_tables');
    }
  }

  public joinTable(tableId: string, buyIn: number, seatIndex?: number) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.joinTable(tableId, buyIn, seatIndex);
    } else {
      this.socket.emit('join_table', {
        tableId,
        buyIn,
        seatIndex,
        name: this.userName,
        avatar: this.userAvatar,
      });
    }
  }

  public createPrivateRoom(params: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    maxSeats?: number;
    buyIn: number;
    enableBots?: boolean;
  }) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.createPrivateRoom(params);
    } else {
      this.socket.emit('create_private_room', params);
    }
  }

  public joinRoomByCode(code: string, buyIn?: number) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.joinRoomByCode(code, buyIn);
    } else {
      this.socket.emit('join_room_by_code', {
        code,
        buyIn,
        name: this.userName,
        avatar: this.userAvatar,
      });
    }
  }

  public leaveTable(tableId: string) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.leaveTable(tableId);
    } else {
      this.socket.emit('leave_table', { tableId });
    }
  }

  public sendAction(tableId: string, action: PlayerActionType, amount?: number) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.sendAction(tableId, action, amount);
    } else {
      this.socket.emit('player_action', { tableId, action, amount });
    }
  }

  public refillChips() {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.refillChips();
    } else {
      this.socket.emit('refill_chips');
    }
  }

  public addBot(tableId: string) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.addBot(tableId);
    } else {
      this.socket.emit('add_bot', { tableId });
    }
  }

  public sendChat(tableId: string, message: string) {
    if (this.usingLocalEngine || !this.socket?.connected) {
      localPokerEngine.sendChat(tableId, message);
    } else {
      this.socket.emit('send_chat', { tableId, message });
    }
  }
}

export const socketService = new SocketService();
