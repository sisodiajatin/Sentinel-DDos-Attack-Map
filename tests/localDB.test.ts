import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { localDB } from '../services/localDB';

const mk = (id: string, timestamp: number) => ({
  id, timestamp, type: 'SYN Flood', magnitude: 5, ip: '1.1.1.1',
  source: { lat: 0, lng: 0, city: 'A', country: 'A' },
  target: { lat: 0, lng: 0, city: 'B', country: 'B' },
}) as any;

describe('localDB', () => {
  it('restores history in the same oldest->newest order the app appends in', async () => {
    await localDB.clear();
    await localDB.saveAttack(mk('a', 1));
    await localDB.saveAttack(mk('b', 2));
    await localDB.saveAttack(mk('c', 3));
    const restored = await localDB.getRecentAttacks(3);
    expect(restored.map(a => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('prunes to 500 entries keeping the newest', async () => {
    await localDB.clear();
    for (let i = 0; i < 505; i++) await localDB.saveAttack(mk(`x${i}`, i));
    expect(await localDB.getCount()).toBe(500);
    const recent = await localDB.getRecentAttacks(1);
    expect(recent[0].id).toBe('x504');
  });
});
