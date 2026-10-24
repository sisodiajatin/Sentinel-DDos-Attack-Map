/**
 * Local Database Service using IndexedDB
 * Provides persistent storage for attack history that survives page refresh.
 * Uses the 'idb' library for a cleaner Promise-based API.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AttackEvent } from '../types';

const DB_NAME = 'sentinelvis';
const DB_VERSION = 1;
const ATTACKS_STORE = 'attacks';
const MAX_ATTACKS = 500;

interface SentinelvisDB extends DBSchema {
  attacks: {
    key: string;
    value: AttackEvent;
    indexes: {
      'by-timestamp': number;
      'by-type': string;
    };
  };
}

let dbInstance: IDBPDatabase<SentinelvisDB> | null = null;

/**
 * Initialize or get existing database connection
 */
async function getDB(): Promise<IDBPDatabase<SentinelvisDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SentinelvisDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create attacks store if it doesn't exist
      if (!db.objectStoreNames.contains(ATTACKS_STORE)) {
        const store = db.createObjectStore(ATTACKS_STORE, { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-type', 'type');
      }
    },
  });

  return dbInstance;
}

/**
 * Local Database API
 */
export const localDB = {
  /**
   * Initialize the database (call on app startup)
   */
  async init(): Promise<void> {
    await getDB();
  },

  /**
   * Save a single attack event
   */
  async saveAttack(attack: AttackEvent): Promise<void> {
    const db = await getDB();
    await db.put(ATTACKS_STORE, attack);

    // Prune old attacks if over limit
    await this.pruneOldAttacks();
  },

  /**
   * Save multiple attack events
   */
  async saveAttacks(attacks: AttackEvent[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(ATTACKS_STORE, 'readwrite');

    await Promise.all([
      ...attacks.map(attack => tx.store.put(attack)),
      tx.done,
    ]);

    await this.pruneOldAttacks();
  },

  /**
   * Get all attacks, sorted by timestamp (newest first)
   */
  async getAllAttacks(): Promise<AttackEvent[]> {
    const db = await getDB();
    const attacks = await db.getAllFromIndex(ATTACKS_STORE, 'by-timestamp');
    return attacks.reverse(); // Newest first
  },

  /**
   * Get the most recent N attacks, ordered oldest -> newest.
   * This matches the in-memory order used by the app, which appends new
   * attacks to the end of the list. Walks the timestamp index backwards
   * with a cursor so only N records are read.
   */
  async getRecentAttacks(limit: number = 50): Promise<AttackEvent[]> {
    const db = await getDB();
    const tx = db.transaction(ATTACKS_STORE, 'readonly');
    const recent: AttackEvent[] = [];
    let cursor = await tx.store.index('by-timestamp').openCursor(null, 'prev');
    while (cursor && recent.length < limit) {
      recent.push(cursor.value);
      cursor = await cursor.continue();
    }
    await tx.done;
    return recent.reverse();
  },

  /**
   * Get attacks by type
   */
  async getAttacksByType(type: string): Promise<AttackEvent[]> {
    const db = await getDB();
    return db.getAllFromIndex(ATTACKS_STORE, 'by-type', type);
  },

  /**
   * Get attack count
   */
  async getCount(): Promise<number> {
    const db = await getDB();
    return db.count(ATTACKS_STORE);
  },

  /**
   * Clear all attack history
   */
  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(ATTACKS_STORE);
  },

  /**
   * Delete a specific attack by ID
   */
  async deleteAttack(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(ATTACKS_STORE, id);
  },

  /**
   * Remove oldest attacks when over limit
   */
  async pruneOldAttacks(): Promise<void> {
    const db = await getDB();
    const count = await db.count(ATTACKS_STORE);
    if (count <= MAX_ATTACKS) return;

    // Delete only the overflow, oldest first, without loading the whole store.
    let toDelete = count - MAX_ATTACKS;
    const tx = db.transaction(ATTACKS_STORE, 'readwrite');
    let cursor = await tx.store.index('by-timestamp').openCursor();
    while (cursor && toDelete > 0) {
      await cursor.delete();
      toDelete--;
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  /**
   * Export all attacks as JSON (for backup/debug)
   */
  async exportToJSON(): Promise<string> {
    const attacks = await this.getAllAttacks();
    return JSON.stringify(attacks, null, 2);
  },

  /**
   * Import attacks from JSON (for restore)
   */
  async importFromJSON(json: string): Promise<number> {
    try {
      const attacks = JSON.parse(json) as AttackEvent[];
      await this.saveAttacks(attacks);
      return attacks.length;
    } catch (error) {
      console.error('Failed to import attacks:', error);
      return 0;
    }
  },
};

export default localDB;
