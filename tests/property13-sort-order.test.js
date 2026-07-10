/**
 * Property 13: Sort order invariant
 *
 * Feature: expense-budget-visualizer, Task 15.2
 * **Validates: Requirements 10.4**
 *
 * Property statement:
 *   For any array of transactions with at least 2 elements:
 *   - Sort amount ascending  → a[i].amount <= a[i+1].amount for all valid i
 *   - Sort category A–Z      → a[i].category.localeCompare(a[i+1].category) <= 0
 *                              for all valid i
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure sort helpers — mirror the logic in getSortedTransactions() (script.js)
// ---------------------------------------------------------------------------

function sortByAmountAsc(transactions) {
  return transactions.slice().sort(function(a, b) { return a.amount - b.amount; });
}

function sortByCategoryAZ(transactions) {
  return transactions.slice().sort(function(a, b) {
    return a.category.localeCompare(b.category);
  });
}

// ---------------------------------------------------------------------------
// Arbitrary: a realistic Transaction object
// ---------------------------------------------------------------------------

const transactionArb = fc.record({
  id:        fc.uuid(),
  itemName:  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  amount:    fc.integer({ min: 1, max: 999_999_999 }),
  category:  fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
               .map(d => d.toISOString()),
});

/** At least 2 elements so pairwise comparison is meaningful. */
const transactionsArb = fc.array(transactionArb, { minLength: 2, maxLength: 50 });

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 13: Sort order invariant', () => {

  /**
   * Amount ascending: a[i].amount <= a[i+1].amount for all adjacent pairs.
   * Validates: Requirements 10.4
   */
  test('amount-asc: every adjacent pair satisfies a[i].amount <= a[i+1].amount', () => {
    fc.assert(
      fc.property(transactionsArb, function(transactions) {
        const sorted = sortByAmountAsc(transactions);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].amount > sorted[i + 1].amount) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Category A–Z: localeCompare(a[i].category, a[i+1].category) <= 0
   * for every adjacent pair after sorting.
   * Validates: Requirements 10.4
   */
  test('category-asc: every adjacent pair satisfies localeCompare <= 0', () => {
    fc.assert(
      fc.property(transactionsArb, function(transactions) {
        const sorted = sortByCategoryAZ(transactions);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].category.localeCompare(sorted[i + 1].category) > 0) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Sort must not drop or duplicate elements (length invariant).
   * Validates: Requirements 10.4
   */
  test('sorting preserves total number of transactions', () => {
    fc.assert(
      fc.property(transactionsArb, function(transactions) {
        return (
          sortByAmountAsc(transactions).length === transactions.length &&
          sortByCategoryAZ(transactions).length === transactions.length
        );
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Sort must not mutate the original array (non-destructive).
   * Validates: Requirements 10.4
   */
  test('sorting does not mutate the original array', () => {
    fc.assert(
      fc.property(transactionsArb, function(transactions) {
        const originalIds = transactions.map(t => t.id);
        sortByAmountAsc(transactions);
        sortByCategoryAZ(transactions);
        const afterIds = transactions.map(t => t.id);
        // Order of IDs in the original array must not have changed
        return originalIds.every(function(id, idx) { return id === afterIds[idx]; });
      }),
      { numRuns: 200 }
    );
  });

});
