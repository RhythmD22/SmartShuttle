import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem(key) { return store[key] ?? null; },
  setItem(key, val) { store[key] = val; },
  removeItem(key) { delete store[key]; },
};
globalThis.alert = () => { };
globalThis.window = globalThis;
globalThis.indexedDB = { open() { return { onerror: null, onupgradeneeded: null, onsuccess: null, onblocked: null, result: null }; } };
globalThis.IDBKeyRange = { upperBound() { return null; } };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => { };

let SS;

before(async () => {
  const mod = await import('../js/utils.js');
  SS = mod.SS;
});

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
});

describe('getRouteTypeText', () => {
  it('returns text for known route types', () => {
    assert.strictEqual(SS.getRouteTypeText(3), 'Bus');
    assert.strictEqual(SS.getRouteTypeText(1), 'Subway, Metro');
    assert.strictEqual(SS.getRouteTypeText(2), 'Rail');
    assert.strictEqual(SS.getRouteTypeText(4), 'Ferry');
  });

  it('returns unknown text for invalid route types', () => {
    const text = SS.getRouteTypeText(99);
    assert.ok(text.includes('Unknown'));
    assert.ok(text.includes('99'));
  });
});

describe('getRouteDisplayName', () => {
  it('prefers route_short_name', () => {
    assert.strictEqual(SS.getRouteDisplayName({ route_short_name: '42' }), '42');
  });

  it('falls back to real_time_route_id', () => {
    assert.strictEqual(SS.getRouteDisplayName({ real_time_route_id: 'R123' }), 'R123');
  });

  it('returns Unknown Route when both are missing', () => {
    assert.strictEqual(SS.getRouteDisplayName({}), 'Unknown Route');
  });
});

describe('getVehicleDisplayData', () => {
  it('uses mode_name when available', () => {
    const result = SS.getVehicleDisplayData({ mode_name: 'Subway' });
    assert.strictEqual(result.text, 'Subway');
    assert.strictEqual(result.cls, 'subway');
  });

  it('falls back to route_type', () => {
    const result = SS.getVehicleDisplayData({ route_type: 3 });
    assert.strictEqual(result.text, 'Bus');
    assert.strictEqual(result.cls, 'bus');
  });

  it('falls back to route_type_id', () => {
    const result = SS.getVehicleDisplayData({ route_type_id: 1 });
    assert.strictEqual(result.text, 'Subway, Metro');
    assert.strictEqual(result.cls, 'subway');
  });

  it('defaults to Bus', () => {
    const result = SS.getVehicleDisplayData({});
    assert.strictEqual(result.text, 'Bus');
    assert.strictEqual(result.cls, 'bus');
  });
});

describe('getVehicleTypeClassFromMode', () => {
  it('returns rail class for light rail mode', () => {
    assert.strictEqual(SS.getVehicleTypeClassFromMode('Light Rail', null, null), 'rail');
  });

  it('returns subway class for metro mode', () => {
    assert.strictEqual(SS.getVehicleTypeClassFromMode('Metro', null, null), 'subway');
  });
});

describe('formatDepartureTime', () => {
  it('returns fallback for null timestamp', () => {
    assert.strictEqual(SS.formatDepartureTime(null), 'No schedule available');
  });

  it('returns Departing now for current time', () => {
    const now = Date.now() / 1000;
    assert.strictEqual(SS.formatDepartureTime(now), 'Departing now');
  });

  it('returns minutes for future departure', () => {
    const future = Date.now() / 1000 + 600;
    assert.strictEqual(SS.formatDepartureTime(future), 'Departing in 10 min');
  });
});

describe('formatDepartureTimeShort', () => {
  it('returns dash for null', () => {
    assert.strictEqual(SS.formatDepartureTimeShort(null), '\u2014');
  });

  it('returns Now for current time', () => {
    assert.strictEqual(SS.formatDepartureTimeShort(Date.now() / 1000), 'Now');
  });

  it('returns minutes for < 60 min', () => {
    assert.strictEqual(SS.formatDepartureTimeShort(Date.now() / 1000 + 300), '5m');
  });

  it('returns hours+minutes for >= 60 min', () => {
    assert.strictEqual(SS.formatDepartureTimeShort(Date.now() / 1000 + 5400), '1h 30m');
  });
});

describe('isRealTimeDeparture', () => {
  it('returns false for null', () => {
    assert.strictEqual(SS.isRealTimeDeparture(null), false);
  });

  it('returns true when is_real_time is true', () => {
    assert.ok(SS.isRealTimeDeparture({ is_real_time: true }));
  });

  it('returns false when is_real_time is false', () => {
    assert.strictEqual(SS.isRealTimeDeparture({ is_real_time: false }), false);
  });
});

describe('formatLocationName', () => {
  it('returns Current Location for falsy input', () => {
    assert.strictEqual(SS.formatLocationName(''), 'Current Location');
    assert.strictEqual(SS.formatLocationName(null), 'Current Location');
  });

  it('returns short form for 3+ parts', () => {
    const result = SS.formatLocationName('123 Main St, Springfield, IL, USA');
    assert.strictEqual(result, '123 Main St, Springfield');
  });

  it('returns single part unchanged', () => {
    assert.strictEqual(SS.formatLocationName('Springfield'), 'Springfield');
  });
});

describe('saveLocationToStorage', () => {
  it('persists a location object', () => {
    const loc = SS.saveLocationToStorage(40.7128, -74.006, 'New York, NY');
    assert.strictEqual(loc.lat, 40.7128);
    assert.strictEqual(loc.lon, -74.006);
    assert.strictEqual(loc.displayName, 'New York, NY');
    assert.ok(loc.timestamp);

    const saved = JSON.parse(localStorage.getItem('selectedLocation'));
    assert.strictEqual(saved.displayName, 'New York, NY');
  });
});

describe('validateFormFields', () => {
  it('returns true when all fields have values', () => {
    assert.ok(SS.validateFormFields({ type: 'bug', desc: 'test' }));
  });

  it('returns false when a field is empty', () => {
    assert.strictEqual(SS.validateFormFields({ type: '', desc: 'test' }), false);
  });
});

describe('validateDescriptionLength', () => {
  it('returns true for long enough description', () => {
    assert.ok(SS.validateDescriptionLength('This is a long enough description'));
  });

  it('returns false for short description', () => {
    assert.strictEqual(SS.validateDescriptionLength('short', 10), false);
  });
});

describe('validateFileSize', () => {
  it('returns true for small file', () => {
    assert.ok(SS.validateFileSize({ size: 1024 }, 3));
  });

  it('returns false for oversized file', () => {
    assert.strictEqual(SS.validateFileSize({ size: 10 * 1024 * 1024 }, 3), false);
  });
});

describe('debounce', () => {
  it('returns a function', () => {
    const debounced = SS.debounce(() => { }, 100);
    assert.strictEqual(typeof debounced, 'function');
  });
});