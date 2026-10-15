import { TableStakes, TableSummary } from '../../../shared/types.js';
import { Table, TableEventCallback } from '../../../shared/engine/Table.js';

export class LobbyManager {
  private tables: Map<string, Table> = new Map();
  private codeToTableId: Map<string, string> = new Map();
  private onBroadcast: TableEventCallback | null = null;

  constructor(broadcastCallback?: TableEventCallback) {
    if (broadcastCallback) {
      this.onBroadcast = broadcastCallback;
    }
    this.initDefaultTables();
  }

  public setBroadcast(cb: TableEventCallback): void {
    this.onBroadcast = cb;
    for (const table of this.tables.values()) {
      table.onBroadcast = cb;
    }
  }

  private initDefaultTables(): void {
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
      if (this.onBroadcast) {
        table.onBroadcast = this.onBroadcast;
      }
      this.tables.set(table.id, table);

      // Seed initial bots
      for (let i = 0; i < cfg.initialBots; i++) {
        table.addBot();
      }
    }
  }

  public createPrivateTable(
    name: string,
    smallBlind: number,
    bigBlind: number,
    maxSeats: number = 6,
    enableBots: boolean = false
  ): { table: Table; code: string } {
    let code = '';
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.codeToTableId.has(code));

    const id = `table_custom_${Date.now()}_${code}`;
    const stakes: TableStakes = {
      id: `stakes_${id}`,
      name: 'Friends Room',
      smallBlind,
      bigBlind,
      minBuyIn: bigBlind * 20,
      maxBuyIn: bigBlind * 200,
      maxSeats,
    };

    const table = new Table(id, name, stakes, code, true);
    if (this.onBroadcast) {
      table.onBroadcast = this.onBroadcast;
    }

    this.tables.set(id, table);
    this.codeToTableId.set(code, id);

    if (enableBots) {
      table.addBot();
      table.addBot();
    }

    return { table, code };
  }

  public getTable(id: string): Table | undefined {
    return this.tables.get(id);
  }

  public getTableByCode(code: string): Table | undefined {
    const cleaned = code.toUpperCase().trim();
    const tableId = this.codeToTableId.get(cleaned);
    if (tableId) {
      return this.tables.get(tableId);
    }
    return this.tables.get(code);
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
}
