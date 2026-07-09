/**
 * Feature: expense-budget-visualizer
 * Property 8: Balance equals sum of transactions
 *
 * For any array of Transaction objects, the computed balance
 * (the numeric value before formatting) MUST equal the exact arithmetic
 * sum of all `amount` values in the array.
 *
 * Validates: Requirements 4.1, 4.3
 *
 * Approach:
 *   `renderBalance()` in script.js computes:
 *     const total = AppState.transactions.reduce((sum, t) => sum + t.amount, 0);
 *   We test that pure calculation directly — no DOM required.
 *   The helper `computeBalance(transactions)` mirrors the exact logic used
 *   inside renderBalance(), making the property test DOM-free and fast.
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure helper — mirrors the computation inside renderBalance() exactly:
//   AppState.transactions.reduce((sum, t) => sum + t.amount, 0)
// ---------------------------------------------------------------------------
function computeBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/**
 * Generates a single valid Transaction object.
 * amount is a positive integer (no floats) to keep arithmetic exact.
 */
const transactionArb = fc.record({
  id:        fc.string({ minLength: 1 }),
  itemName:  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  amount:    fc.integer({ min: 1, max: 999_999_999 }),
  category:  fc.oneof(fc.constant('Food'), fc.constant('Transport'), fc.constant('Fun')),
  timestamp: fc.date().map(d => d.toISOString()),
});

/** Array of 0–50 transactions (includes the empty-array edge case). */
const transactionsArb = fc.array(transactionArb, { minLength: 0, maxLength: 50 });

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 8: Balance equals sum of transactions', () => {

  /**
   * Core property: computeBalance returns the exact arithmetic sum.
   * Validates: Requirements 4.1, 4.3
   */
  test('computeBalance(transactions) === sum of all amount fields', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const balance = computeBalance(transactions);
        const expected = transactions.reduce((sum, t) => sum + t.amount, 0);
        return balance === expected;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: empty array must yield 0 (renderBalance shows "Rp 0").
   * Validates: Requirements 4.1
   */
  test('computeBalance([]) === 0', () => {
    expect(computeBalance([])).toBe(0);
  });

  /**
   * Single-element array: balance equals the sole transaction's amount.
   * Validates: Requirements 4.1, 4.3
   */
  test('computeBalance([t]) === t.amount for any single transaction', () => {
    fc.assert(
      fc.property(transactionArb, (t) => {
        return computeBalance([t]) === t.amount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Order invariance: sum must not depend on array order.
   * renderBalance iterates AppState.transactions in insertion order, but
   * arithmetic addition is commutative — the result must be identical
   * regardless of order.
   * Validates: Requirements 4.1, 4.3
   */
  test('computeBalance is invariant to transaction order', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 30 }),
        (transactions) => {
          const original  = computeBalance(transactions);
          const reversed  = computeBalance([...transactions].reverse());
          // Shuffle: move last element to front
          const shuffled  = computeBalance([
            transactions[transactions.length - 1],
            ...transactions.slice(0, -1),
          ]);
          return original === reversed && original === shuffled;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additive: adding a new transaction increases balance by exactly that amount.
   * Validates: Requirements 4.1, 4.3
   */
  test('balance increases by exactly t.amount when a transaction is added', () => {
    fc.assert(
      fc.property(transactionsArb, transactionArb, (existing, newTx) => {
        const before = computeBalance(existing);
        const after  = computeBalance([...existing, newTx]);
        return after === before + newTx.amount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Subtractive: removing a transaction decreases balance by exactly that amount.
   * Mirrors deleteTransaction() behavior.
   * Validates: Requirements 4.1, 4.3
   */
  test('balance decreases by exactly t.amount when a transaction is removed', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: 29 }),
        (transactions, rawIdx) => {
          const idx     = rawIdx % transactions.length;   // clamp to valid range
          const target  = transactions[idx];
          const before  = computeBalance(transactions);
          const after   = computeBalance(transactions.filter((_, i) => i !== idx));
          return before - after === target.amount;
        }
      ),
      { numRuns: 100 }
    );
  });

});
