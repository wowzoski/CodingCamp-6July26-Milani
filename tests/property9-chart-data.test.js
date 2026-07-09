/**
 * Property 9: Chart data excludes zero-total categories
 *
 * For any array of transactions, prepareChartData(transactions) must return a
 * ChartData object where:
 *   1. Every label corresponds to a category whose total amount is strictly > 0.
 *   2. data[i] equals the exact sum of `amount` for all transactions in labels[i].
 *   3. Empty input → empty labels / data / colors arrays.
 *   4. Categories whose amounts sum to 0 (or negative) are excluded from the result.
 *
 * Validates: Requirements 5.1
 *
 * Strategy: prepareChartData is a pure function — no DOM, no localStorage.
 * We inline the implementation faithfully from js/script.js.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline implementation extracted from js/script.js
// ---------------------------------------------------------------------------

function getColorForCategory(category) {
  const colorMap = {
    'Food':      '#A47148',
    'Transport': '#8A9A5B',
    'Fun':       '#C97C5D',
  };
  return colorMap[category] || '#B5654A';
}

/**
 * Exact copy of prepareChartData from js/script.js.
 * @param {Array} transactions
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 */
function prepareChartData(transactions) {
  // Group by category and sum amounts
  const totals = {};
  transactions.forEach(function(t) {
    if (!totals[t.category]) totals[t.category] = 0;
    totals[t.category] += t.amount;
  });

  // Filter out categories with 0 total, build output arrays
  const labels = [];
  const data = [];
  const colors = [];

  Object.keys(totals).forEach(function(category) {
    if (totals[category] > 0) {
      labels.push(category);
      data.push(totals[category]);
      colors.push(getColorForCategory(category));
    }
  });

  return { labels, data, colors };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** One of the known categories; also allow arbitrary strings for the
 *  "unknown / fallback" colour path. */
const knownCategory = fc.constantFrom('Food', 'Transport', 'Fun');
const anyCategory   = fc.oneof(
  knownCategory,
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
);

/** A transaction with a positive amount. */
const positiveTransaction = fc.record({
  id:        fc.string({ minLength: 1 }),
  itemName:  fc.string({ minLength: 1, maxLength: 100 }),
  amount:    fc.double({ min: 0.01, max: 999_999_999.99, noNaN: true, noDefaultInfinity: true })
                .filter(n => n > 0),
  category:  anyCategory,
  timestamp: fc.constant(new Date().toISOString()),
});

/** A transaction whose amount is exactly 0. */
const zeroTransaction = fc.record({
  id:        fc.string({ minLength: 1 }),
  itemName:  fc.string({ minLength: 1, maxLength: 100 }),
  amount:    fc.constant(0),
  category:  anyCategory,
  timestamp: fc.constant(new Date().toISOString()),
});

/** An array of transactions that may include zeroes. */
const mixedTransactionArray = fc.array(
  fc.oneof(positiveTransaction, zeroTransaction),
  { minLength: 0, maxLength: 20 }
);

// ---------------------------------------------------------------------------
// Helper: compute expected totals per category from raw transactions
// ---------------------------------------------------------------------------
function computeTotals(transactions) {
  const totals = {};
  for (const t of transactions) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 9: Chart data excludes zero-total categories', () => {

  // -------------------------------------------------------------------------
  // Property-based test: every label has a strictly positive total
  // -------------------------------------------------------------------------
  it('every label in the result has a strictly positive total', () => {
    // Feature: expense-budget-visualizer, Property 9: Chart data excludes zero-total categories
    fc.assert(
      fc.property(mixedTransactionArray, (transactions) => {
        const { labels } = prepareChartData(transactions);
        const totals = computeTotals(transactions);

        for (const label of labels) {
          // Each label must map to a total > 0
          expect(totals[label]).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property-based test: data[i] equals exact sum of matching transactions
  // -------------------------------------------------------------------------
  it('data[i] equals the exact sum of amounts for all transactions in labels[i]', () => {
    // Feature: expense-budget-visualizer, Property 9: Chart data excludes zero-total categories
    fc.assert(
      fc.property(fc.array(positiveTransaction, { minLength: 1, maxLength: 20 }), (transactions) => {
        const { labels, data } = prepareChartData(transactions);
        const totals = computeTotals(transactions);

        expect(labels.length).toBe(data.length);

        for (let i = 0; i < labels.length; i++) {
          expect(data[i]).toBeCloseTo(totals[labels[i]], 10);
        }
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property-based test: categories that sum to 0 are excluded
  // -------------------------------------------------------------------------
  it('categories whose amounts sum to 0 are excluded from the result', () => {
    // Feature: expense-budget-visualizer, Property 9: Chart data excludes zero-total categories
    fc.assert(
      fc.property(mixedTransactionArray, (transactions) => {
        const { labels } = prepareChartData(transactions);
        const totals = computeTotals(transactions);

        // Any category with total === 0 must NOT appear in labels
        for (const [category, total] of Object.entries(totals)) {
          if (total === 0) {
            expect(labels).not.toContain(category);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property-based test: lengths of labels, data, and colors are always equal
  // -------------------------------------------------------------------------
  it('labels, data, and colors arrays always have the same length', () => {
    // Feature: expense-budget-visualizer, Property 9: Chart data excludes zero-total categories
    fc.assert(
      fc.property(mixedTransactionArray, (transactions) => {
        const { labels, data, colors } = prepareChartData(transactions);
        expect(labels.length).toBe(data.length);
        expect(labels.length).toBe(colors.length);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Example-based: empty input → empty output arrays
  // -------------------------------------------------------------------------
  it('returns empty arrays when given an empty transaction list', () => {
    const result = prepareChartData([]);
    expect(result.labels).toEqual([]);
    expect(result.data).toEqual([]);
    expect(result.colors).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Example-based: single positive transaction
  // -------------------------------------------------------------------------
  it('returns one entry for a single positive transaction', () => {
    const transactions = [
      { id: '1', itemName: 'Makan siang', amount: 35000, category: 'Food', timestamp: '' }
    ];
    const { labels, data, colors } = prepareChartData(transactions);

    expect(labels).toEqual(['Food']);
    expect(data).toEqual([35000]);
    expect(colors).toEqual(['#A47148']);
  });

  // -------------------------------------------------------------------------
  // Example-based: same category is summed correctly
  // -------------------------------------------------------------------------
  it('sums multiple transactions of the same category correctly', () => {
    const transactions = [
      { id: '1', itemName: 'Kopi', amount: 20000, category: 'Food', timestamp: '' },
      { id: '2', itemName: 'Makan', amount: 50000, category: 'Food', timestamp: '' },
    ];
    const { labels, data } = prepareChartData(transactions);

    expect(labels).toContain('Food');
    const idx = labels.indexOf('Food');
    expect(data[idx]).toBe(70000);
  });

  // -------------------------------------------------------------------------
  // Example-based: category with amount 0 is excluded
  // -------------------------------------------------------------------------
  it('excludes a category whose only transaction has amount 0', () => {
    const transactions = [
      { id: '1', itemName: 'Gratis', amount: 0, category: 'Fun', timestamp: '' },
      { id: '2', itemName: 'Bensin', amount: 40000, category: 'Transport', timestamp: '' },
    ];
    const { labels } = prepareChartData(transactions);

    expect(labels).not.toContain('Fun');
    expect(labels).toContain('Transport');
  });

  // -------------------------------------------------------------------------
  // Example-based: multiple categories keep their correct sums
  // -------------------------------------------------------------------------
  it('handles multiple categories each with correct independent sums', () => {
    const transactions = [
      { id: '1', itemName: 'Makan', amount: 30000, category: 'Food', timestamp: '' },
      { id: '2', itemName: 'Ojek', amount: 15000, category: 'Transport', timestamp: '' },
      { id: '3', itemName: 'Nonton', amount: 60000, category: 'Fun', timestamp: '' },
      { id: '4', itemName: 'Snack', amount: 10000, category: 'Food', timestamp: '' },
    ];
    const { labels, data } = prepareChartData(transactions);

    const foodIdx = labels.indexOf('Food');
    const transportIdx = labels.indexOf('Transport');
    const funIdx = labels.indexOf('Fun');

    expect(foodIdx).toBeGreaterThanOrEqual(0);
    expect(data[foodIdx]).toBe(40000);  // 30000 + 10000

    expect(transportIdx).toBeGreaterThanOrEqual(0);
    expect(data[transportIdx]).toBe(15000);

    expect(funIdx).toBeGreaterThanOrEqual(0);
    expect(data[funIdx]).toBe(60000);
  });
});
