import {
  ChatMessage,
  PlayerActionType,
  TableStakes,
  TableState,
  TableSummary,
  UserProfile,
} from '../../../shared/types.js';
import { Table } from '../../../shared/engine/Table.js';

type Listener = (event: string, payload: any) => void;

export class LocalPokerEngine {
  private tables: Map<string, Table> = new Map();
  private codeToTableId: Map<string, string> = new Map();
  private listeners: Set<Listener> = new Set();
  private currentTableId: string | null = null;

  constructor() {
    this.initTables();
  }

  private initTables(): void {
    const tableConfigs: { id: string; name: string; stakes: TableStakes; initialBots: number }[] = [
      {
        id: 'table-novice',
        name: 'Novice Lounge (10/20)',
        stakes: {
          id: 'stakes-novice',
          name: 'Micro Stakes',
          smallBlind: 10,
          bigBlind: 20,
          minBuyIn: 400,
          maxBuyIn: 2000,
          maxSeats: 6,
        },
        initialBots: 3,
      },
      {
        id: 'table-downtown',
        name: 'Downtown Club (50/100)',
        stakes: {
          id: 'stakes-downtown',
          name: 'Low Stakes',
          smallBlind: 50,
          bigBlind: 100,
          minBuyIn: 2000,
          maxBuyIn: 10000,
          maxSeats: 6,
        },
        initialBots: 3,
      },
      {
        id: 'table-high-roller',
        name: 'High Roller VIP (500/1000)',
        stakes: {
          id: 'stakes-vip',
          name: 'High Stakes',
          smallBlind: 500,
          bigBlind: 1000,
          minBuyIn: 20000,
          maxBuyIn: 100000,
          maxSeats: 6,
        },
        initialBots: 2,
      },
      {
        id: 'table-vegas-9max',
        name: 'Vegas 9-Max (100/200)',
        stakes: {
          id: 'stakes-vegas',
          name: 'Mid Stakes',
          smallBlind: 100,
          bigBlind: 200,
          minBuyIn: 4000,
          maxBuyIn: 20000,
          maxSeats: 9,
        },
        initialBots: 4,
      },
    ];

    for (const cfg of tableConfigs) {
      const table = new Table(cfg.id, cfg.name, cfg.stakes);
      table.onBroadcast = (event, id) => {
        if (this.currentTableId === id) {
          const user = this.getUserProfile();
          this.emit('table_state', table.getStateForPlayer(user.id));
        }
        this.emit('table_list', this.getAllSummaries());
      };
      this.tables.set(table.id, table);

      for (let i = 0; i < cfg.initialBots; i++) {
        table.addBot();
      }
    }
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(event: string, payload: any): void {
    for (const fn of this.listeners) {
      fn(event, payload);
    }
  }

  public getUserProfile(): UserProfile {
    const id = localStorage.getItem('poker_user_id') || 'player_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('poker_user_id', id);
    const name = localStorage.getItem('poker_user_name') || 'Player_1';
    const avatar = localStorage.getItem('poker_user_avatar') || 'avatar1';
    const chipsStr = localStorage.getItem('poker_user_chips');
    const chips = chipsStr ? Number(chipsStr) : 10000;

    return { id, name, chips, avatar };
  }

  public saveChips(chips: number): void {
    localStorage.setItem('poker_user_chips', chips.toString());
  }

  public getAllSummaries(): TableSummary[] {
    const list: TableSummary[] = [];
    for (const table of this.tables.values()) {
      const playerCount = table.seats.filter((s) => s !== null).length;
      list.push({
        id: table.id,
        name: table.name,
        code: table.code,
        isPrivate: table.isPrivate,
        stakes: table.stakes,
        playerCount,
        maxSeats: table.stakes.maxSeats,
        stage: table.stage,
      });
    }
    return list;
  }

  public joinTable(tableId: string, buyIn: number, seatIndex?: number): void {
    const table = this.tables.get(tableId);
    if (!table) {
      this.emit('action_result', { success: false, error: 'Table not found' });
      return;
    }

    const user = this.getUserProfile();
    if (user.chips < buyIn) {
      this.emit('action_result', { success: false, error: 'Not enough chips for buy-in' });
      return;
    }

    let targetSeat = seatIndex;
    if (
      targetSeat === undefined ||
      targetSeat < 0 ||
      targetSeat >= table.stakes.maxSeats ||
      table.seats[targetSeat] !== null
    ) {
      targetSeat = table.seats.findIndex((s) => s === null);
    }

    if (targetSeat === -1) {
      this.emit('action_result', { success: false, error: 'Table is full' });
      return;
    }

    user.chips -= buyIn;
    this.saveChips(user.chips);
    this.emit('user_profile', user);

    const sitRes = table.sitPlayer(targetSeat, user.id, user.name, user.avatar, buyIn, false);
    if (!sitRes.success) {
      user.chips += buyIn;
      this.saveChips(user.chips);
      this.emit('user_profile', user);
      this.emit('action_result', sitRes);
      return;
    }

    this.currentTableId = table.id;
    this.emit('table_state', table.getStateForPlayer(user.id));
    this.emit('action_result', { success: true });
  }

  public createPrivateRoom(params: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    maxSeats?: number;
    buyIn: number;
    enableBots?: boolean;
  }): void {
    const user = this.getUserProfile();
    if (user.chips < params.buyIn) {
      this.emit('action_result', { success: false, error: 'Not enough chips for buy-in' });
      return;
    }

    let code = '';
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.codeToTableId.has(code));

    const id = `table_custom_${Date.now()}_${code}`;
    const stakes: TableStakes = {
      id: `stakes_${id}`,
      name: 'Friends Room',
      smallBlind: params.smallBlind,
      bigBlind: params.bigBlind,
      minBuyIn: params.bigBlind * 20,
      maxBuyIn: params.bigBlind * 200,
      maxSeats: params.maxSeats || 6,
    };

    const table = new Table(id, params.name || `${user.name}'s Table`, stakes, code, true);
    table.onBroadcast = (event, tId) => {
      if (this.currentTableId === tId) {
        const u = this.getUserProfile();
        this.emit('table_state', table.getStateForPlayer(u.id));
      }
      this.emit('table_list', this.getAllSummaries());
    };

    this.tables.set(id, table);
    this.codeToTableId.set(code, id);

    if (params.enableBots) {
      table.addBot();
      table.addBot();
    }

    user.chips -= params.buyIn;
    this.saveChips(user.chips);
    this.emit('user_profile', user);

    table.sitPlayer(0, user.id, user.name, user.avatar, params.buyIn, false);
    this.currentTableId = table.id;

    this.emit('room_created', { tableId: table.id, code });
    this.emit('table_state', table.getStateForPlayer(user.id));
    this.emit('action_result', { success: true });
  }

  public joinRoomByCode(code: string, buyIn?: number): void {
    const cleaned = code.toUpperCase().trim();
    const tableId = this.codeToTableId.get(cleaned) || cleaned;
    const table = this.tables.get(tableId);

    if (!table) {
      this.emit('action_result', { success: false, error: 'Room code not found' });
      return;
    }

    const user = this.getUserProfile();
    const actualBuyIn = buyIn || Math.min(table.stakes.minBuyIn, user.chips);
    this.joinTable(table.id, actualBuyIn);
  }

  public leaveTable(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) return;

    const user = this.getUserProfile();
    const res = table.leaveSeat(user.id);
    if (res && res.chipsReturned > 0) {
      user.chips += res.chipsReturned;
      this.saveChips(user.chips);
      this.emit('user_profile', user);
    }
    this.currentTableId = null;
    this.emit('table_list', this.getAllSummaries());
  }

  public sendAction(tableId: string, action: PlayerActionType, amount?: number): void {
    const table = this.tables.get(tableId);
    if (!table) return;
    const user = this.getUserProfile();
    const res = table.handleAction(user.id, action, amount);
    this.emit('action_result', res);
  }

  public addBot(tableId: string): void {
    const table = this.tables.get(tableId);
    if (!table) return;
    table.addBot();
  }

  public refillChips(): void {
    const user = this.getUserProfile();
    user.chips += 5000;
    this.saveChips(user.chips);
    this.emit('user_profile', user);
  }

  public updateProfile(name: string, avatar?: string): void {
    const user = this.getUserProfile();
    user.name = name;
    if (avatar) user.avatar = avatar;
    localStorage.setItem('poker_user_name', name);
    if (avatar) localStorage.setItem('poker_user_avatar', avatar);
    this.emit('user_profile', user);
  }

  public sendChat(tableId: string, message: string): void {
    const user = this.getUserProfile();
    const chatMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: user.name,
      message: message.slice(0, 100),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.emit('chat_message', chatMsg);
  }
}

export const localPokerEngine = new LocalPokerEngine();
