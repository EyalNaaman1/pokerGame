import { io, Socket } from 'socket.io-client';
import { PlayerActionType } from '../../../shared/types.js';

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

  public init(): Socket {
    if (this.socket) return this.socket;

    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/';
    this.socket = io(serverUrl, {
      query: {
        userId: this.userId,
        name: this.userName || undefined,
        avatar: this.userAvatar,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to Poker Server, socket ID:', this.socket?.id);
    });

    return this.socket;
  }

  public updateProfile(name: string, avatar?: string) {
    this.userName = name;
    localStorage.setItem('poker_user_name', name);
    if (avatar) {
      this.userAvatar = avatar;
      localStorage.setItem('poker_user_avatar', avatar);
    }
    this.socket?.emit('update_profile', { name, avatar });
  }

  public getTables() {
    this.socket?.emit('get_tables');
  }

  public joinTable(tableId: string, buyIn: number, seatIndex?: number) {
    this.socket?.emit('join_table', {
      tableId,
      buyIn,
      seatIndex,
      name: this.userName,
      avatar: this.userAvatar,
    });
  }

  public createPrivateRoom(params: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    maxSeats?: number;
    buyIn: number;
    enableBots?: boolean;
  }) {
    this.socket?.emit('create_private_room', params);
  }

  public joinRoomByCode(code: string, buyIn?: number) {
    this.socket?.emit('join_room_by_code', {
      code,
      buyIn,
      name: this.userName,
      avatar: this.userAvatar,
    });
  }

  public leaveTable(tableId: string) {
    this.socket?.emit('leave_table', { tableId });
  }

  public sendAction(tableId: string, action: PlayerActionType, amount?: number) {
    this.socket?.emit('player_action', { tableId, action, amount });
  }

  public refillChips() {
    this.socket?.emit('refill_chips');
  }

  public addBot(tableId: string) {
    this.socket?.emit('add_bot', { tableId });
  }

  public sendChat(tableId: string, message: string) {
    this.socket?.emit('send_chat', { tableId, message });
  }
}

export const socketService = new SocketService();
