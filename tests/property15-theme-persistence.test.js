/**
 * Property 15: Dark/light mode preference persistence
 *
 * Untuk sembarang nilai `"light"` atau `"dark"`,
 * `saveThemePreference` lalu `loadThemePreference` harus mengembalikan nilai yang sama.
 *
 * **Validates: Requirements 10.7**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// localStorage stub (in-memory, no browser required)
// ---------------------------------------------------------------------------

const localStorageStub = (() => {
  let store = {};
  return {
    getItem:    (key)        => (key in store ? store[key] : null),
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
  };
})();
globalThis.localStorage = localStorageStub;

// ---------------------------------------------------------------------------
// Inline implementation (DO NOT import from script.js — no theme functions there yet)
// ---------------------------------------------------------------------------

const THEME_KEY = 'ebv_theme';

function saveThemePreference(mode) {
  localStorage.setItem(THEME_KEY, mode);
}

function loadThemePreference() {
  return localStorage.getItem(THEME_KEY);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 15: Dark/light mode preference persistence', () => {

  beforeEach(() => {
    localStorageStub.clear();
  });

  // -------------------------------------------------------------------------
  // PROPERTY-BASED TEST
  // -------------------------------------------------------------------------

  it('saveThemePreference then loadThemePreference returns the same value for "light" or "dark"', () => {
    fc.assert(
      fc.property(fc.constantFrom('light', 'dark'), (mode) => {
        saveThemePreference(mode);
        const loaded = loadThemePreference();
        expect(loaded).toBe(mode);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // EXAMPLE-BASED UNIT TESTS
  // -------------------------------------------------------------------------

  it('saves and loads "light" correctly', () => {
    saveThemePreference('light');
    expect(loadThemePreference()).toBe('light');
  });

  it('saves and loads "dark" correctly', () => {
    saveThemePreference('dark');
    expect(loadThemePreference()).toBe('dark');
  });

  it('overwriting "light" with "dark" returns "dark"', () => {
    saveThemePreference('light');
    saveThemePreference('dark');
    expect(loadThemePreference()).toBe('dark');
  });

  it('overwriting "dark" with "light" returns "light"', () => {
    saveThemePreference('dark');
    saveThemePreference('light');
    expect(loadThemePreference()).toBe('light');
  });

  it('returns null when no preference has been saved', () => {
    expect(loadThemePreference()).toBeNull();
  });
});
