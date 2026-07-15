const TransitCache = (() => {
  const DB_NAME = 'SmartShuttleCache';
  const DB_VERSION = 2;
  const STORE_NAME = 'transitCache';
  const DEFAULT_TTL = 5 * 60 * 1000;

  let db = null;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        dbPromise = null;
        reject(event.target.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB blocked — close other tabs using this DB');
      };
    });

    return dbPromise;
  }

  function cacheKey(lat, lng) {
    const rLat = Math.round(lat * 1000) / 1000;
    const rLng = Math.round(lng * 1000) / 1000;
    return `lat_${rLat}_lon_${rLng}`;
  }

  async function get(key) {
    try {
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.error('Cache read error:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async function set(key, data, ttl = DEFAULT_TTL) {
    try {
      const database = await openDB();
      return new Promise((resolve) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const entry = { key, data, timestamp: Date.now(), ttl };
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Cache write error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  function isFresh(entry) {
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age < (entry.ttl || DEFAULT_TTL);
  }

  async function getTransitData(lat, lng) {
    const key = cacheKey(lat, lng);
    return get(key);
  }

  async function setTransitData(lat, lng, data) {
    const key = cacheKey(lat, lng);
    return set(key, data);
  }

  async function cleanup() {
    try {
      const database = await openDB();
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const maxAge = Date.now() - 24 * 60 * 60 * 1000;
      const range = IDBKeyRange.upperBound(maxAge);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      request.onerror = () => {
        console.error('Cache cleanup error:', request.error);
      };
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  setInterval(cleanup, 60 * 60 * 1000);
  cleanup();

  return {
    getTransitData,
    setTransitData,
    isFresh,
    cacheKey,
  };
})();

export { TransitCache };