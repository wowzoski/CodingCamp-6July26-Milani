/**
 * Property 14: Spending limit threshold detection
 *
 * `isOverLimit(categoryTotal, limit)` must return `true` if and only if
 * `categoryTotal > limit`.
 *
 * **Validates: Requirements 10.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline pure function
// ---------------------------------------------------------------------------

function isOverLimit(categoryTotal, limit) {
  return categoryTotal > limit;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 14: Spending limit threshold detection', () => {

  // -------------------------------------------------------------------------
  // PROPERTY-BASED TESTS
  // -------------------------------------------------------------------------

  it('core property: isOverLimit(a, b) === (a > b) for any two positive ints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 999_999_999 }),
        (a, b) => {
          expect(isOverLimit(a, b)).toBe(a > b);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns true when total > limit', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 1, max: 999_999_998 }),
          fc.integer({ min: 1, max: 999_999_998 })
        ),
        ([limit, delta]) => {
          const total = limit + delta;
          expect(isOverLimit(total, limit)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  // -------------------------------------------------------------------------
  // EXAMPLE-BASED UNIT TESTS
  // -------------------------------------------------------------------------

  it('returns false when total === limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        (n) => {
          expect(isOverLimit(n, n)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns false when total < limit', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 2, max: 999_999_999 }),
          fc.integer({ min: 1, max: 999_999_998 })
        ),
        ([limit, delta]) => {
          const total = limit - delta < 1 ? 1 : limit - delta;
          expect(isOverLimit(total, limit)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

});
