import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, PlayerActionType } from '../../shared/types.js';
import { UserStore } from './db/store.js';
import { LobbyManager } from './lobby/LobbyManager.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const userStore = new UserStore();
const lobbyManager = new LobbyManager();

// Configure broadcast callback from tables
lobbyManager.setBroadcast((event: string, tableId: string) => {
  const table = lobbyManager.getTable(tableId);
  if (!table) return;

  // Send personalized state to each socket in the room so private cards remain private
  const roomName = `table:${tableId}`;
  const roomSockets = io.sockets.adapter.rooms.get(roomName);

  if (roomSockets) {
    for (const socketId of roomSockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        const userId = socket.data.userId;
        const playerState = table.getStateForPlayer(userId);
        socket.emit('table_state', playerState);
      }
    }
  }

  // Also broadcast lobby summary update to lobby viewers
  io.emit('table_list', lobbyManager.getAllSummaries());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

io.on('connection', (socket: Socket) => {
  let userId = (socket.handshake.query.userId as string) || uuidv4();
  const userName = socket.handshake.query.name as string | undefined;
  const userAvatar = socket.handshake.query.avatar as string | undefined;

  socket.data.userId = userId;

  // Get or create player profile
  const profile = userStore.getOrCreateUser(userId, userName, userAvatar);
  socket.emit('user_profile', profile);

  // Send current table list
  socket.emit('table_list', lobbyManager.getAllSummaries());

  socket.on('get_tables', () => {
    socket.emit('table_list', lobbyManager.getAllSummaries());
  });

  socket.on('refill_chips', () => {
    const updated = userStore.refillChips(socket.data.userId, 5000);
    if (updated) {
      socket.emit('user_profile', updated);
    }
  });

  socket.on(
    'join_table',
    ({
      tableId,
      buyIn,
      seatIndex,
      name,
      avatar,
    }: {
      tableId: string;
      buyIn: number;
      seatIndex?: number;
      name?: string;
      avatar?: string;
    }) => {
      const table = lobbyManager.getTable(tableId);
      if (!table) {
        socket.emit('action_result', { success: false, error: 'Table not found' });
        return;
      }

      const user = userStore.getOrCreateUser(socket.data.userId, name, avatar);
      if (user.chips < buyIn) {
        socket.emit('action_result', { success: false, error: 'Not enough chips for buy-in' });
        return;
      }

      // Find available seat if not specified
      let targetSeat = seatIndex;
      if (targetSeat === undefined || targetSeat < 0 || targetSeat >= table.stakes.maxSeats || table.seats[targetSeat] !== null) {
        targetSeat = table.seats.findIndex((s) => s === null);
      }

      if (targetSeat === -1) {
        socket.emit('action_result', { success: false, error: 'Table is full' });
        return;
      }

      // Deduct chips from wallet and sit down
      userStore.updateChips(user.id, -buyIn);
      socket.emit('user_profile', userStore.getOrCreateUser(user.id));

      const sitResult = table.sitPlayer(targetSeat, user.id, user.name, user.avatar, buyIn, false);
      if (!sitResult.success) {
        // Refund
        userStore.updateChips(user.id, buyIn);
        socket.emit('user_profile', userStore.getOrCreateUser(user.id));
        socket.emit('action_result', sitResult);
        return;
      }

      socket.join(`table:${tableId}`);
      socket.data.currentTableId = tableId;

      // Broadcast updated state
      socket.emit('table_state', table.getStateForPlayer(user.id));
      socket.emit('action_result', { success: true });
    }
  );

  socket.on('leave_table', ({ tableId }: { tableId: string }) => {
    const table = lobbyManager.getTable(tableId);
    if (!table) return;

    const result = table.leaveSeat(socket.data.userId);
    if (result && result.chipsReturned > 0) {
      const updated = userStore.updateChips(socket.data.userId, result.chipsReturned);
      if (updated) {
        socket.emit('user_profile', updated);
      }
    }

    socket.leave(`table:${tableId}`);
    socket.data.currentTableId = null;
  });

  socket.on(
    'player_action',
    ({
      tableId,
      action,
      amount,
    }: {
      tableId: string;
      action: PlayerActionType;
      amount?: number;
    }) => {
      const table = lobbyManager.getTable(tableId);
      if (!table) {
        socket.emit('action_result', { success: false, error: 'Table not found' });
        return;
      }

      const res = table.handleAction(socket.data.userId, action, amount);
      socket.emit('action_result', res);
    }
  );

  socket.on('add_bot', ({ tableId }: { tableId: string }) => {
    const table = lobbyManager.getTable(tableId);
    if (!table) return;
    table.addBot();
  });

  socket.on(
    'create_private_room',
    ({
      name,
      smallBlind,
      bigBlind,
      maxSeats,
      buyIn,
      enableBots,
    }: {
      name: string;
      smallBlind: number;
      bigBlind: number;
      maxSeats?: number;
      buyIn: number;
      enableBots?: boolean;
    }) => {
      const user = userStore.getOrCreateUser(socket.data.userId);
      if (user.chips < buyIn) {
        socket.emit('action_result', { success: false, error: 'Not enough chips for buy-in' });
        return;
      }

      const { table, code } = lobbyManager.createPrivateTable(
        name || `${user.name}'s Table`,
        smallBlind,
        bigBlind,
        maxSeats || 6,
        enableBots ?? false
      );

      // Deduct chips and seat player at seat 0
      userStore.updateChips(user.id, -buyIn);
      socket.emit('user_profile', userStore.getOrCreateUser(user.id));

      table.sitPlayer(0, user.id, user.name, user.avatar, buyIn, false);
      socket.join(`table:${table.id}`);
      socket.data.currentTableId = table.id;

      socket.emit('room_created', { tableId: table.id, code });
      socket.emit('table_state', table.getStateForPlayer(user.id));
      socket.emit('action_result', { success: true });
    }
  );

  socket.on(
    'join_room_by_code',
    ({
      code,
      buyIn,
      seatIndex,
      name,
      avatar,
    }: {
      code: string;
      buyIn?: number;
      seatIndex?: number;
      name?: string;
      avatar?: string;
    }) => {
      const table = lobbyManager.getTableByCode(code);
      if (!table) {
        socket.emit('action_result', { success: false, error: 'Room code not found' });
        return;
      }

      const user = userStore.getOrCreateUser(socket.data.userId, name, avatar);
      const actualBuyIn = buyIn || Math.min(table.stakes.minBuyIn, user.chips);

      if (user.chips < actualBuyIn) {
        socket.emit('action_result', {
          success: false,
          error: `Minimum buy-in is $${table.stakes.minBuyIn}`,
        });
        return;
      }

      // Find available seat
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
        socket.emit('action_result', { success: false, error: 'Room is full' });
        return;
      }

      userStore.updateChips(user.id, -actualBuyIn);
      socket.emit('user_profile', userStore.getOrCreateUser(user.id));

      const sitResult = table.sitPlayer(targetSeat, user.id, user.name, user.avatar, actualBuyIn, false);
      if (!sitResult.success) {
        userStore.updateChips(user.id, actualBuyIn);
        socket.emit('user_profile', userStore.getOrCreateUser(user.id));
        socket.emit('action_result', sitResult);
        return;
      }

      socket.join(`table:${table.id}`);
      socket.data.currentTableId = table.id;

      socket.emit('table_state', table.getStateForPlayer(user.id));
      socket.emit('action_result', { success: true });
    }
  );

  socket.on('update_profile', ({ name, avatar }: { name: string; avatar?: string }) => {
    const user = userStore.getOrCreateUser(socket.data.userId);
    user.name = name.trim().slice(0, 16);
    if (avatar) user.avatar = avatar;
    userStore.save();
    socket.emit('user_profile', user);
  });

  socket.on('send_chat', ({ tableId, message }: { tableId: string; message: string }) => {
    const user = userStore.getOrCreateUser(socket.data.userId);
    const chatMsg: ChatMessage = {
      id: uuidv4(),
      sender: user.name,
      message: message.slice(0, 100),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    io.to(`table:${tableId}`).emit('chat_message', chatMsg);
  });

  socket.on('disconnect', () => {
    if (socket.data.currentTableId) {
      const table = lobbyManager.getTable(socket.data.currentTableId);
      if (table) {
        const result = table.leaveSeat(socket.data.userId);
        if (result && result.chipsReturned > 0) {
          userStore.updateChips(socket.data.userId, result.chipsReturned);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`♠️ Zynga Poker Server running on http://localhost:${PORT}`);
});
