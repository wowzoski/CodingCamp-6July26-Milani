/**
 * Property 12: Monthly grouping aggregation
 *
 * For any array of transactions, groupByMonth(transactions) must return an
 * object where:
 *   1. Every key is formatted as "YYYY-MM" (exactly 7 characters, valid year and
 *      zero-padded month 01–12).
 *   2. Each value equals the exact sum of `amount` for all transactions whose
 *      timestamp falls in that month.
 *
 * Validates: Requirements 10.3
 *
 * Strategy: groupByMonth is a pure function — no DOM, no localStorage.
 * We inline the implementation faithfully from js/script.js.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline implementation extracted from js/script.js
// ---------------------------------------------------------------------------

/**
 * Exact copy of groupByMonth from js/script.js.
 * @param {Array} transactions
 * @returns {Object} Map of "YYYY-MM" → total amount
 */
function groupByMonth(transactions) {
  const result = {};
  transactions.forEach(function(t) {
    const d = new Date(t.timestamp);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    result[key] = (result[key] || 0) + t.amount;
  });
  return result;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generate a valid ISO 8601 timestamp for a specific year/month */
const yearArb  = fc.integer({ min: 2000, max: 2099 });
const monthArb = fc.integer({ min: 1, max: 12 });

/** A timestamp string for a given (year, month) pair */
const timestampArb = fc.tuple(yearArb, monthArb).map(([year, month]) => {
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-01T00:00:00.000Z`;
});

/** A single transaction with a positive amount and a controlled timestamp */
const transactionArb = fc.record({
  id:        fc.string({ minLength: 1, maxLength: 20 }),
  itemName:  fc.string({ minLength: 1, maxLength: 100 }),
  amount:    fc.double({ min: 1, max: 999_999_999, noNaN: true, noDefaultInfinity: true })
               .filter(n => n > 0),
  category:  fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: timestampArb,
});

/** Array of 0–30 transactions */
const transactionArrayArb = fc.array(transactionArb, { minLength: 0, maxLength: 30 });

// ---------------------------------------------------------------------------
// Helper: expected "YYYY-MM" key from an ISO timestamp
// ---------------------------------------------------------------------------
function expectedKey(timestamp) {
  const d = new Date(timestamp);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 12: Monthly grouping aggregation', () => {

  // -------------------------------------------------------------------------
  // Property: every key is in "YYYY-MM" format
  // -------------------------------------------------------------------------
  it('every key in the result is formatted as "YYYY-MM"', () => {
    // Validates: Requirements 10.3
    fc.assert(
      fc.property(transactionArrayArb, (transactions) => {
        const grouped = groupByMonth(transactions);
        const yyyy_mm = /^\d{4}-(0[1-9]|1[0-2])$/;

        for (const key of Object.keys(grouped)) {
          expect(key).toMatch(yyyy_mm);
        }
      }),
      { numRuns: 200 }
    );
  });

  // -------------------------------------------------------------------------
  // Property: each value equals the exact sum of amounts for that month
  // -------------------------------------------------------------------------
  it('each value equals the exact sum of amounts for transactions in that month', () => {
    // Validates: Requirements 10.3
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1, maxLength: 30 }), (transactions) => {
        const grouped = groupByMonth(transactions);

        for (const key of Object.keys(grouped)) {
          // Manually compute expected sum for this key
          const expected = transactions
            .filter(t => expectedKey(t.timestamp) === key)
            .reduce((sum, t) => sum + t.amount, 0);

          expect(grouped[key]).toBeCloseTo(expected, 10);
        }
      }),
      { numRuns: 200 }
    );
  });

  // -------------------------------------------------------------------------
  // Property: no key is omitted — all months present in input appear in output
  // -------------------------------------------------------------------------
  it('all months present in the input transactions appear as keys in the result', () => {
    // Validates: Requirements 10.3
    fc.assert(
      fc.property(fc.array(transactionArb, { minLength: 1, maxLength: 30 }), (transactions) => {
        const grouped = groupByMonth(transactions);
        const expectedKeys = new Set(transactions.map(t => expectedKey(t.timestamp)));

        for (const key of expectedKeys) {
          expect(grouped).toHaveProperty(key);
        }
      }),
      { numRuns: 200 }
    );
  });

  // -------------------------------------------------------------------------
  // Example-based: empty input → empty result
  // -------------------------------------------------------------------------
  it('returns an empty object for an empty transaction list', () => {
    expect(groupByMonth([])).toEqual({});
  });

  // -------------------------------------------------------------------------
  // Example-based: single transaction maps to its month
  // -------------------------------------------------------------------------
  it('groups a single transaction into the correct month key', () => {
    const transactions = [
      { id: '1', itemName: 'Makan', amount: 35000, category: 'Food', timestamp: '2024-07-15T10:00:00.000Z' }
    ];
    const result = groupByMonth(transactions);
    expect(result['2024-07']).toBe(35000);
    expect(Object.keys(result)).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Example-based: transactions in the same month are summed
  // -------------------------------------------------------------------------
  it('sums multiple transactions in the same month', () => {
    const transactions = [
      { id: '1', itemName: 'Kopi',  amount: 20000, category: 'Food', timestamp: '2024-07-01T08:00:00.000Z' },
      { id: '2', itemName: 'Makan', amount: 50000, category: 'Food', timestamp: '2024-07-20T12:00:00.000Z' },
    ];
    const result = groupByMonth(transactions);
    expect(result['2024-07']).toBe(70000);
    expect(Object.keys(result)).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Example-based: transactions in different months stay separate
  // -------------------------------------------------------------------------
  it('keeps transactions in different months as separate keys', () => {
    const transactions = [
      { id: '1', itemName: 'Ojek',   amount: 15000, category: 'Transport', timestamp: '2024-06-10T09:00:00.000Z' },
      { id: '2', itemName: 'Nonton', amount: 60000, category: 'Fun',       timestamp: '2024-07-05T19:00:00.000Z' },
      { id: '3', itemName: 'Bensin', amount: 80000, category: 'Transport', timestamp: '2024-08-22T07:00:00.000Z' },
    ];
    const result = groupByMonth(transactions);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result['2024-06']).toBe(15000);
    expect(result['2024-07']).toBe(60000);
    expect(result['2024-08']).toBe(80000);
  });

  // -------------------------------------------------------------------------
  // Example-based: month number is zero-padded (01–09)
  // -------------------------------------------------------------------------
  it('pads single-digit month numbers with a leading zero', () => {
    const transactions = [
      { id: '1', itemName: 'Item', amount: 5000, category: 'Food', timestamp: '2024-03-07T00:00:00.000Z' }
    ];
    const result = groupByMonth(transactions);
    expect(Object.keys(result)).toContain('2024-03');
  });
});
