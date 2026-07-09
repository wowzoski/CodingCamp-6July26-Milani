/**
 * Feature: expense-budget-visualizer
 * Property 5: Delete removes from storage
 *
 * For any array of transactions with at least one element, and any valid
 * transaction id within that array, after calling deleteTransaction(id) and
 * then loadTransactions(), the returned array SHALL NOT contain any transaction
 * with that id.  AppState.transactions must also not contain it.
 *
 * Validates: Requirements 2.2, 3.4
 *
 * Strategy: deleteTransaction() has DOM side-effects (calls renderAll), so we
 * stub globalThis.document and globalThis.localStorage.  The functions under
 * test are reproduced faithfully from js/script.js — any future change to the
 * implementation must be reflected here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Minimal stubs for browser globals
// ---------------------------------------------------------------------------

// localStorage stub
const localStorageStub = (() => {
  let store = {};
  return {
    getItem:    (key) => (key in store ? store[key] : null),
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
globalThis.localStorage = localStorageStub;

// Minimal DOM stub — renderAll/renderBalance/renderTransactionList use document;
// we only need them to be no-ops so deleteTransaction doesn't throw.
globalThis.document = {
  getElementById:    () => null,
  querySelectorAll:  () => ({ forEach: () => {} }),
  createElement:     () => ({
    className: '',
    innerHTML: '',
    appendChild: () => {},
  }),
};

// ---------------------------------------------------------------------------
// Inline implementation of units under test, extracted from js/script.js
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

function loadTransactions() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return {
      transactions: [],
      error: 'localStorage tidak tersedia: ' + (err.message || String(err)),
    };
  }

  if (raw === null) return { transactions: [] };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      transactions: [],
      error: 'Data tersimpan tidak valid (corrupt JSON), memulai ulang dengan data kosong.',
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      transactions: [],
      error: 'Data tersimpan tidak valid (bukan array), memulai ulang dengan data kosong.',
    };
  }

  return { transactions: parsed };
}

function renderAll() {
  // no-op in test environment — DOM not available
}

const AppState = {
  transactions: [],
  chartInstance: null,
};

function deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(
    function (t) { return t.id !== id; }
  );
  saveTransactions(AppState.transactions);
  renderAll();
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a single Transaction-shaped object.
 * Uses integer amounts to keep arithmetic exact.
 */
const transactionArb = fc.record({
  id:        fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
  itemName:  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  amount:    fc.integer({ min: 1, max: 999_999_999 }),
  category:  fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.date().map(d => d.toISOString()),
});

/**
 * Generates a non-empty array of transactions with guaranteed-unique ids,
 * plus the index of the one to delete.
 *
 * We build the array with distinct ids so the filter logic in deleteTransaction
 * removes exactly one element — matching the real app behaviour where
 * Date.now()-Math.random() ids are unique.
 */
const nonEmptyTransactionsWithTargetArb = fc
  .array(transactionArb, { minLength: 1, maxLength: 30 })
  // Make ids unique within the generated array
  .map((txs) =>
    txs.map((t, i) => ({ ...t, id: `${t.id}-unique-${i}` }))
  )
  .chain((txs) =>
    fc.integer({ min: 0, max: txs.length - 1 }).map((targetIdx) => ({
      transactions: txs,
      targetId: txs[targetIdx].id,
    }))
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 5: Delete removes from storage', () => {
  beforeEach(() => {
    AppState.transactions = [];
    localStorageStub.clear();
  });

  // --- Core property-based test ---

  it('after deleteTransaction(id), neither AppState.transactions nor loadTransactions() contain the deleted id', () => {
    // Feature: expense-budget-visualizer, Property 5: Delete removes from storage
    // Validates: Requirements 2.2, 3.4
    fc.assert(
      fc.property(nonEmptyTransactionsWithTargetArb, ({ transactions, targetId }) => {
        // Seed AppState and localStorage with the generated array
        AppState.transactions = [...transactions];
        saveTransactions(AppState.transactions);

        // Act
        deleteTransaction(targetId);

        // Assert 1: in-memory state no longer contains the id
        const inMemory = AppState.transactions.some((t) => t.id === targetId);
        expect(inMemory).toBe(false);

        // Assert 2: persisted state no longer contains the id
        const { transactions: persisted } = loadTransactions();
        const inStorage = persisted.some((t) => t.id === targetId);
        expect(inStorage).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // --- Example-based unit tests ---

  it('removes the target transaction from AppState.transactions (single element)', () => {
    AppState.transactions = [
      { id: 'tx-1', itemName: 'Makan siang', amount: 35000, category: 'Food', timestamp: new Date().toISOString() },
    ];
    saveTransactions(AppState.transactions);

    deleteTransaction('tx-1');

    expect(AppState.transactions).toHaveLength(0);
  });

  it('removes only the target transaction when multiple transactions exist', () => {
    AppState.transactions = [
      { id: 'tx-1', itemName: 'Kopi', amount: 20000, category: 'Food', timestamp: new Date().toISOString() },
      { id: 'tx-2', itemName: 'Ojek', amount: 18000, category: 'Transport', timestamp: new Date().toISOString() },
      { id: 'tx-3', itemName: 'Film', amount: 60000, category: 'Fun', timestamp: new Date().toISOString() },
    ];
    saveTransactions(AppState.transactions);

    deleteTransaction('tx-2');

    expect(AppState.transactions).toHaveLength(2);
    expect(AppState.transactions.some((t) => t.id === 'tx-2')).toBe(false);
    expect(AppState.transactions.some((t) => t.id === 'tx-1')).toBe(true);
    expect(AppState.transactions.some((t) => t.id === 'tx-3')).toBe(true);
  });

  it('persists the removal to localStorage', () => {
    AppState.transactions = [
      { id: 'tx-A', itemName: 'Bensin', amount: 50000, category: 'Transport', timestamp: new Date().toISOString() },
      { id: 'tx-B', itemName: 'Snack', amount: 8000, category: 'Food', timestamp: new Date().toISOString() },
    ];
    saveTransactions(AppState.transactions);

    deleteTransaction('tx-A');

    const { transactions: persisted } = loadTransactions();
    expect(persisted.some((t) => t.id === 'tx-A')).toBe(false);
    expect(persisted.some((t) => t.id === 'tx-B')).toBe(true);
  });

  it('is a no-op when the id does not exist', () => {
    AppState.transactions = [
      { id: 'tx-X', itemName: 'Parkir', amount: 5000, category: 'Transport', timestamp: new Date().toISOString() },
    ];
    saveTransactions(AppState.transactions);

    deleteTransaction('non-existent-id');

    expect(AppState.transactions).toHaveLength(1);
    const { transactions: persisted } = loadTransactions();
    expect(persisted).toHaveLength(1);
  });

  it('results in an empty array after deleting the only transaction (both memory and storage)', () => {
    AppState.transactions = [
      { id: 'solo', itemName: 'Solo item', amount: 15000, category: 'Fun', timestamp: new Date().toISOString() },
    ];
    saveTransactions(AppState.transactions);

    deleteTransaction('solo');

    expect(AppState.transactions).toHaveLength(0);
    const { transactions: persisted } = loadTransactions();
    expect(persisted).toHaveLength(0);
  });

  it('in-memory and persisted state are in sync after delete', () => {
    AppState.transactions = [
      { id: 'a', itemName: 'Item A', amount: 10000, category: 'Food', timestamp: new Date().toISOString() },
      { id: 'b', itemName: 'Item B', amount: 20000, category: 'Fun', timestamp: new Date().toISOString() },
    ];
    saveTransactions(AppState.transactions);

    deleteTransaction('a');

    const { transactions: persisted } = loadTransactions();
    expect(AppState.transactions).toHaveLength(persisted.length);
    AppState.transactions.forEach((t, i) => {
      expect(t.id).toBe(persisted[i].id);
    });
  });
});
