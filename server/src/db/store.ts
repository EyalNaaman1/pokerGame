import fs from 'fs';
import path from 'path';
import { UserProfile } from '../../../shared/types.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

export class UserStore {
  private users: Map<string, UserProfile> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data: UserProfile[] = JSON.parse(raw);
        for (const u of data) {
          this.users.set(u.id, u);
        }
      }
    } catch (err) {
      console.warn('Failed to load user data, using fresh store', err);
    }
  }

  public save(): void {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.users.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save user data', err);
    }
  }

  public getOrCreateUser(id: string, name?: string, avatar?: string): UserProfile {
    let user = this.users.get(id);
    if (!user) {
      const avatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6'];
      user = {
        id,
        name: name || `Player_${id.slice(0, 4)}`,
        chips: 10000, // 10,000 free chips starting bankroll
        avatar: avatar || avatars[Math.floor(Math.random() * avatars.length)],
      };
      this.users.set(id, user);
      this.save();
    }
    return user;
  }

  public updateChips(id: string, delta: number): UserProfile | null {
    const user = this.users.get(id);
    if (!user) return null;
    user.chips = Math.max(0, user.chips + delta);
    this.save();
    return user;
  }

  public refillChips(id: string, amount: number = 5000): UserProfile | null {
    const user = this.users.get(id);
    if (!user) return null;
    user.chips += amount;
    this.save();
    return user;
  }
}
