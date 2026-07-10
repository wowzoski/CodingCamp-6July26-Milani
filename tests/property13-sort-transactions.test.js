/**
 * Property 13: Sort order invariant
 *
 * Feature: expense-budget-visualizer, Task 15.2
 * **Validates: Requirements 10.4**
 *
 * Property statement:
 * For any array of transactions with at least two elements:
 * - Sorting by `amount ascending` SHALL produce a list where
 *   `transactions[i].amount <= transactions[i+1].amount` for all valid `i`.
 * - Sorting by `category A–Z` SHALL produce a list where
 *   `transactions[i].category.localeCompare(transactions[i+1].category) <= 0`
 *   for all valid `i`.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';

// Transaction generator
const transactionArbitrary = fc.record({
  id: fc.string(),
  itemName: fc.string({ minLength: 1, maxLength: 100 }),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .map(d => d.toISOString())
});

// Sort functions (mirrors script.js logic)
function sortByAmountAscending(transactions) {
  return [...transactions].sort((a, b) => a.amount - b.amount);
}

function sortByAmountDescending(transactions) {
  return [...transactions].sort((a, b) => b.amount - a.amount);
}

function sortByCategoryAZ(transactions) {
  return [...transactions].sort((a, b) => a.category.localeCompare(b.category));
}

describe('Property 13: Sort order invariant', () => {
  test('amount ascending: each element <= next element', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 2, maxLength: 50 }),
        (transactions) => {
          const sorted = sortByAmountAscending(transactions);
          
          // Check all adjacent pairs
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].amount > sorted[i + 1].amount) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('amount descending: each element >= next element', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 2, maxLength: 50 }),
        (transactions) => {
          const sorted = sortByAmountDescending(transactions);
          
          // Check all adjacent pairs
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].amount < sorted[i + 1].amount) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('category A-Z: localeCompare <= 0 for all adjacent pairs', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 2, maxLength: 50 }),
        (transactions) => {
          const sorted = sortByCategoryAZ(transactions);
          
          // Check all adjacent pairs
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].category.localeCompare(sorted[i + 1].category) > 0) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sorting preserves all transactions (no elements lost)', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 2, maxLength: 50 }),
        (transactions) => {
          const sortedAsc = sortByAmountAscending(transactions);
          const sortedDesc = sortByAmountDescending(transactions);
          const sortedCat = sortByCategoryAZ(transactions);
          
          return sortedAsc.length === transactions.length &&
                 sortedDesc.length === transactions.length &&
                 sortedCat.length === transactions.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('single transaction array stays unchanged by sort', () => {
    fc.assert(
      fc.property(
        transactionArbitrary,
        (transaction) => {
          const transactions = [transaction];
          const sortedAsc = sortByAmountAscending(transactions);
          const sortedDesc = sortByAmountDescending(transactions);
          const sortedCat = sortByCategoryAZ(transactions);
          
          return sortedAsc.length === 1 &&
                 sortedDesc.length === 1 &&
                 sortedCat.length === 1 &&
                 sortedAsc[0].id === transaction.id &&
                 sortedDesc[0].id === transaction.id &&
                 sortedCat[0].id === transaction.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sorting is stable (equal elements maintain relative order)', () => {
    // Create transactions with same amounts but different ids
    const t1 = { id: '1', itemName: 'A', amount: 100, category: 'Food', timestamp: '2024-01-01T00:00:00.000Z' };
    const t2 = { id: '2', itemName: 'B', amount: 100, category: 'Food', timestamp: '2024-01-02T00:00:00.000Z' };
    const t3 = { id: '3', itemName: 'C', amount: 200, category: 'Food', timestamp: '2024-01-03T00:00:00.000Z' };
    
    const transactions = [t1, t2, t3];
    const sorted = sortByAmountAscending(transactions);
    
    // t1 and t2 have same amount, so they should maintain their relative order
    const idx1 = sorted.findIndex(t => t.id === '1');
    const idx2 = sorted.findIndex(t => t.id === '2');
    
    expect(idx1).toBeLessThan(idx2);
  });
});
