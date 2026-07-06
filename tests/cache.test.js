import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem(key) { return store[key] ?? null; },
  setItem(key, val) { store[key] = val; },
  removeItem(key) { delete store[key]; },
};

const intervals = [];
globalThis.setInterval = (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; };
globalThis.clearInterval = () => { };

globalThis.indexedDB = {
  open() {
    return {
      onerror: null,
      onupgradeneeded: null,
      onsuccess: null,
      onblocked: null,
      result: null,
    };
  },
};
globalThis.IDBKeyRange = { upperBound() { return null; } };

let TransitCache;

before(async () => {
  const mod = await import('../js/cache.js');
  TransitCache = mod.TransitCache;
});

describe('cacheKey', () => {
  it('rounds coordinates to 3 decimal places', () => {
    const key = TransitCache.cacheKey(39.828345, -98.579678);
    assert.strictEqual(key, 'lat_39.828_lon_-98.58');
  });

  it('generates consistent keys for same coordinates', () => {
    const k1 = TransitCache.cacheKey(40.7128, -74.006);
    const k2 = TransitCache.cacheKey(40.7128, -74.006);
    assert.strictEqual(k1, k2);
  });

  it('generates different keys for different coordinates', () => {
    const k1 = TransitCache.cacheKey(40.7128, -74.006);
    const k2 = TransitCache.cacheKey(34.0522, -118.2437);
    assert.notStrictEqual(k1, k2);
  });
});

describe('isFresh', () => {
  it('returns false for null entry', () => {
    assert.strictEqual(TransitCache.isFresh(null), false);
  });

  it('returns true for a recent entry', () => {
    const entry = { data: {}, timestamp: Date.now() - 1000, ttl: 5 * 60 * 1000 };
    assert.ok(TransitCache.isFresh(entry));
  });

  it('returns false for an expired entry', () => {
    const entry = { data: {}, timestamp: Date.now() - 10 * 60 * 1000, ttl: 5 * 60 * 1000 };
    assert.strictEqual(TransitCache.isFresh(entry), false);
  });

  it('uses default TTL when entry has none', () => {
    const entry = { data: {}, timestamp: Date.now() - 1000 };
    assert.ok(TransitCache.isFresh(entry));
  });
});