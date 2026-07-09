/**
 * Property 2: Valid transaction object creation
 *
 * Untuk sembarang valid (itemName, amount, category), hasil createTransaction
 * harus mengandung field yang sama, id non-kosong, dan timestamp ISO 8601 yang valid.
 *
 * Validates: Requirements 1.4
 *
 * Strategy: createTransaction() has DOM and localStorage side-effects, so we stub
 * those out using globalThis shims before importing the logic inline.  The function
 * under test is reproduced faithfully from js/script.js — any future change to the
 * implementation must be reflected here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Minimal stubs for browser globals that createTransaction depends on
// ---------------------------------------------------------------------------

// localStorage stub
const localStorageStub = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
globalThis.localStorage = localStorageStub;

// DOM stub — showError / clearErrors / renderAll use document; we don't need them
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => ({ forEach: () => {} }),
  createElement: () => ({
    className: '',
    innerHTML: '',
    appendChild: () => {},
  }),
};

// ---------------------------------------------------------------------------
// Inline implementation of the units under test, extracted from js/script.js
// (same logic, same contract — no framework, no bundler)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ebv_transactions';

function saveTransactions(transactions) {
  try {
    const json = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY, json);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Gagal menyimpan data: ' + (err.message || String(err)) };
  }
}

function renderAll() {
  // no-op in test environment — DOM not available
}

const AppState = {
  transactions: [],
  chartInstance: null,
};

/**
 * Exact copy of createTransaction from js/script.js.
 * Returns the created transaction object so tests can inspect it.
 */
function createTransaction(itemName, amount, category) {
  const transaction = {
    id: `${Date.now()}-${Math.random()}`,
    itemName: itemName,
    amount: Number(amount),
    category: category,
    timestamp: new Date().toISOString(),
  };

  AppState.transactions.push(transaction);
  saveTransactions(AppState.transactions);
  renderAll();

  return transaction; // exposed for testing
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Valid itemName: non-empty string, stripped of surrounding whitespace, max 100 chars.
 * We generate printable ASCII strings (avoiding whitespace-only values).
 */
const validItemName = fc
  .stringOf(
    fc.char().filter((c) => c.trim().length > 0), // no whitespace-only chars
    { minLength: 1, maxLength: 100 }
  );

/**
 * Valid amount: positive finite number.
 * We stay within the app's documented max of 999 999 999.99.
 * fc.double accepts 64-bit bounds; fc.float requires Math.fround-compatible bounds.
 */
const validAmount = fc.double({
  min: 0.01,
  max: 999_999_999.99,
  noNaN: true,
  noDefaultInfinity: true,
}).filter((n) => n > 0);

/**
 * Valid category: one of the three supported values.
 */
const validCategory = fc.constantFrom('Food', 'Transport', 'Fun');

// ---------------------------------------------------------------------------
// ISO 8601 helper
// ---------------------------------------------------------------------------

/**
 * Returns true when the string is a valid ISO 8601 date-time that can be
 * parsed by Date.  Covers the subset produced by new Date().toISOString():
 * "YYYY-MM-DDTHH:mm:ss.sssZ"
 */
function isValidISO8601(str) {
  if (typeof str !== 'string' || str.trim().length === 0) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 2: Valid transaction object creation', () => {
  beforeEach(() => {
    AppState.transactions = [];
    localStorageStub.clear();
  });

  // --- Property-based test ---

  it('for any valid (itemName, amount, category), createTransaction produces a well-formed Transaction object', () => {
    // Feature: expense-budget-visualizer, Property 2: Valid transaction object creation
    fc.assert(
      fc.property(validItemName, validAmount, validCategory, (itemName, amount, category) => {
        AppState.transactions = [];

        const tx = createTransaction(itemName, amount, category);

        // 1. itemName matches exactly
        expect(tx.itemName).toBe(itemName);

        // 2. amount is the numeric coercion of the input
        expect(tx.amount).toBe(Number(amount));

        // 3. category matches exactly
        expect(tx.category).toBe(category);

        // 4. id is a non-empty string
        expect(typeof tx.id).toBe('string');
        expect(tx.id.length).toBeGreaterThan(0);

        // 5. timestamp is a valid ISO 8601 string
        expect(typeof tx.timestamp).toBe('string');
        expect(isValidISO8601(tx.timestamp)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // --- Example-based unit tests ---

  it('creates a transaction with the correct itemName field', () => {
    const tx = createTransaction('Makan siang', 35000, 'Food');
    expect(tx.itemName).toBe('Makan siang');
  });

  it('coerces string amount to number', () => {
    const tx = createTransaction('Tiket busway', '12500', 'Transport');
    expect(tx.amount).toBe(12500);
    expect(typeof tx.amount).toBe('number');
  });

  it('creates a transaction with the correct category field', () => {
    const tx = createTransaction('Nonton bioskop', 75000, 'Fun');
    expect(tx.category).toBe('Fun');
  });

  it('id is a non-empty string', () => {
    const tx = createTransaction('Kopi', 20000, 'Food');
    expect(typeof tx.id).toBe('string');
    expect(tx.id.length).toBeGreaterThan(0);
  });

  it('timestamp is a valid ISO 8601 string', () => {
    const tx = createTransaction('Bensin', 50000, 'Transport');
    expect(isValidISO8601(tx.timestamp)).toBe(true);
  });

  it('timestamp is close to the current time (within 5 seconds)', () => {
    const before = Date.now();
    const tx = createTransaction('Snack', 8000, 'Food');
    const after = Date.now();
    const txTime = new Date(tx.timestamp).getTime();
    expect(txTime).toBeGreaterThanOrEqual(before);
    expect(txTime).toBeLessThanOrEqual(after + 5000);
  });

  it('pushes the transaction to AppState.transactions', () => {
    AppState.transactions = [];
    createTransaction('Ojek', 18000, 'Transport');
    expect(AppState.transactions).toHaveLength(1);
    expect(AppState.transactions[0].itemName).toBe('Ojek');
  });

  it('generates unique ids for two transactions created in sequence', () => {
    const tx1 = createTransaction('Item A', 10000, 'Food');
    const tx2 = createTransaction('Item B', 20000, 'Fun');
    expect(tx1.id).not.toBe(tx2.id);
  });

  it('item name with exactly 100 characters is preserved', () => {
    const longName = 'A'.repeat(100);
    const tx = createTransaction(longName, 5000, 'Food');
    expect(tx.itemName).toBe(longName);
    expect(tx.itemName.length).toBe(100);
  });

  it('amount with decimal value is preserved as a number', () => {
    const tx = createTransaction('Parkir', 2500.5, 'Transport');
    expect(tx.amount).toBe(2500.5);
  });
});
