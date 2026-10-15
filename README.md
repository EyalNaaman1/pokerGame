# ♠️ Zynga-Style Poker Web Game (Texas Hold'em)

A real-time multiplayer Texas Hold'em poker web application inspired by **Zynga Poker**. Built with an authoritative TypeScript Node.js backend and an interactive React frontend with authentic felt tables, circular turn timers, sound effects, side-pot calculations, and intelligent poker bots.

---

## ✨ Features

- **Authoritative Poker Engine**:
  - Full No-Limit Texas Hold'em Finite State Machine (Pre-flop, Flop, Turn, River, Showdown).
  - 7-Card Hand Evaluator scoring all standard hands with kicker tie-breakers (Royal Flush, Straight Flush, Quads, Full House, Flush, Wheel straights, Two Pair, etc.).
  - Side Pot & All-In Manager: accurately handles multi-way all-ins, short-stack pots, and uncalled bet refunds.
- **Zynga Poker Aesthetic**:
  - Classic oval green felt poker table with leather padded rails and ambient watermark felt lighting.
  - Circular player avatars positioned along an elliptical perimeter with dynamic auto-rotation (the local player is always centered at the bottom).
  - **Animated Turn Timer Ring**: SVG countdown circle that smoothly transitions from green to amber to red as the 15-second turn expires.
  - Realistic card dealing with 3D flip animations; opponents' hole cards are masked until showdown.
  - In-game live chat with quick reaction badges.
- **Betting Controls**:
  - Fold (with free-check detection).
  - Dynamic Check / Call button showing chip requirements.
  - Bet / Raise slider with quick presets (`MIN`, `1/2 POT`, `POT`, `ALL IN`) and fine-tuning `+` / `-` buttons.
- **Intelligent Poker Bots**:
  - Tables automatically seat bots so you can play immediately without waiting for other players.
  - Bots evaluate hand strength, pot odds, play realistic aggressive/passive moves, and simulate human think time.
  - Add extra bots at any table with the `+ Bot` button.
- **Web Audio Sound Effects**:
  - Zero-latency Web Audio API synthesizer for chip clicks, card swooshes, knuckle table checks, turn alerts, and victory fanfares.
- **Economy & Persistence**:
  - 10,000 chip starting bankroll stored in browser local storage.
  - **"+5K FREE" Refill** button to replenish chips anytime.
  - Multi-stake rooms: Micro Stakes (10/20), Low Stakes (50/100), Mid Stakes (100/200), and High Roller VIP (500/1000).

---

## 🚀 Quick Start

### 1. Start the Server
In the root directory or inside `/server`:
```bash
npm run dev:server
```
*Server runs on `http://localhost:3001`.*

### 2. Start the Web Client
In another terminal:
```bash
npm run dev:client
```
*Client runs on `http://localhost:3000`.*

Open [http://localhost:3000](http://localhost:3000) in your browser!

### 3. Run Automated Tests
```bash
npm test
```
Runs unit tests for the 7-card hand evaluator, side pot manager, and table state machine.

---

## 📁 Project Structure

```
pokerGame/
├── shared/               # Shared TypeScript types & interfaces
│   └── types.ts          # Card, Hand, TableState, Events, Actions
├── server/               # Node.js + Express + Socket.IO server
│   ├── src/
│   │   ├── engine/       # HandEvaluator, Deck, PotManager, Table, BotPlayer
│   │   ├── lobby/        # LobbyManager (stake rooms, table management)
│   │   ├── db/           # UserStore (bankroll, persistence)
│   │   └── index.ts      # Main Socket.IO server entry
│   └── test/             # Automated test suite
└── client/               # React (Vite) + Tailwind CSS + Framer Motion
    ├── src/
    │   ├── components/   # PokerTable, PlayerSeat, ActionControls, Lobby, Chat
    │   ├── services/     # Socket client, Web Audio synthesizer
    │   ├── App.tsx       # Root component & state management
    │   └── main.tsx
```
