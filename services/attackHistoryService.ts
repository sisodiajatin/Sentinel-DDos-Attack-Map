/**
 * Attack History Service for Time-Travel Mode
 * Stores 24 hours of attack history for replay functionality.
 * Uses IndexedDB with time-based retention and efficient range queries.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AttackEvent } from '../types';

const DB_NAME = 'sentinelvis-history';
const DB_VERSION = 1;
const HISTORY_STORE = 'attackHistory';
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ENTRIES = 30000; // Safety limit (~14MB)

interface HistoryDB extends DBSchema {
  attackHistory: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      attack: AttackEvent;
    };
    indexes: {
      'by-timestamp': number;
    };
  };
}

let dbInstance: IDBPDatabase<HistoryDB> | null = null;
let cleanupIntervalId: number | null = null;

/**
 * Initialize or get existing database connection
 */
async function getDB(): Promise<IDBPDatabase<HistoryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<HistoryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

/**
 * Attack History Service API
 */
export const attackHistoryService = {
  /**
   * Initialize the service and start cleanup timer
   */
  async init(): Promise<void> {
    await getDB();
    await this.cleanup();

    // Start periodic cleanup
    if (cleanupIntervalId === null) {
      cleanupIntervalId = window.setInterval(() => {
        this.cleanup();
      }, CLEANUP_INTERVAL_MS);
    }
  },

  /**
   * Stop cleanup timer (call on unmount)
   */
  dispose(): void {
    if (cleanupIntervalId !== null) {
      clearInterval(cleanupIntervalId);
      cleanupIntervalId = null;
    }
  },

  /**
   * Save an attack to history
   */
  async saveAttack(attack: AttackEvent): Promise<void> {
    const db = await getDB();

    // Check entry count before saving
    const count = await db.count(HISTORY_STORE);
    if (count >= MAX_ENTRIES) {
      await this.cleanup();
    }

    await db.put(HISTORY_STORE, {
      id: attack.id,
      timestamp: attack.timestamp,
      attack,
    });
  },

  /**
   * Save multiple attacks in a batch
   */
  async saveAttacks(attacks: AttackEvent[]): Promise<void> {
    if (attacks.length === 0) return;

    const db = await getDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');

    await Promise.all([
      ...attacks.map(attack =>
        tx.store.put({
          id: attack.id,
          timestamp: attack.timestamp,
          attack,
        })
      ),
      tx.done,
    ]);
  },

  /**
   * Get attacks within a time range (inclusive)
   */
  async getAttacksInRange(startTime: number, endTime: number): Promise<AttackEvent[]> {
    const db = await getDB();
    const range = IDBKeyRange.bound(startTime, endTime);
    const entries = await db.getAllFromIndex(HISTORY_STORE, 'by-timestamp', range);
    return entries.map(e => e.attack);
  },

  /**
   * Get attacks visible at a specific point in time
   * Returns attacks that started within windowMs before the timestamp
   */
  async getAttacksAtTime(timestamp: number, windowMs: number = 5000): Promise<AttackEvent[]> {
    const startTime = timestamp - windowMs;
    return this.getAttacksInRange(startTime, timestamp);
  },

  /**
   * Get the time range of stored history
   */
  async getTimeRange(): Promise<{ earliest: number; latest: number } | null> {
    const db = await getDB();
    const count = await db.count(HISTORY_STORE);

    if (count === 0) return null;

    // Get earliest
    const earliestCursor = await db.transaction(HISTORY_STORE)
      .store.index('by-timestamp').openCursor();
    const earliest = earliestCursor?.value.timestamp ?? Date.now();

    // Get latest
    const latestCursor = await db.transaction(HISTORY_STORE)
      .store.index('by-timestamp').openCursor(null, 'prev');
    const latest = latestCursor?.value.timestamp ?? Date.now();

    return { earliest, latest };
  },

  /**
   * Get total count of stored attacks
   */
  async getCount(): Promise<number> {
    const db = await getDB();
    return db.count(HISTORY_STORE);
  },

  /**
   * Get attack density for a time range (for scrub bar visualization)
   * Returns counts bucketed into intervals
   */
  async getAttackDensity(
    startTime: number,
    endTime: number,
    buckets: number = 100
  ): Promise<number[]> {
    const attacks = await this.getAttacksInRange(startTime, endTime);
    const bucketSize = (endTime - startTime) / buckets;
    const density = new Array(buckets).fill(0);

    attacks.forEach(attack => {
      const bucketIndex = Math.min(
        buckets - 1,
        Math.floor((attack.timestamp - startTime) / bucketSize)
      );
      density[bucketIndex]++;
    });

    return density;
  },

  /**
   * Delete attacks older than retention period
   */
  async cleanup(): Promise<number> {
    const db = await getDB();
    const cutoffTime = Date.now() - RETENTION_MS;

    // Find old entries
    const range = IDBKeyRange.upperBound(cutoffTime);
    const oldEntries = await db.getAllKeysFromIndex(HISTORY_STORE, 'by-timestamp', range);

    if (oldEntries.length === 0) return 0;

    // Delete in batches
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    await Promise.all([
      ...oldEntries.map(key => tx.store.delete(key)),
      tx.done,
    ]);

    return oldEntries.length;
  },

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(HISTORY_STORE);
  },
};

export default attackHistoryService;
