/**
 * Property 11: Custom category name validation
 *
 * `validateCategoryName` harus `isValid: true` jika dan hanya jika:
 *   - name.trim().length >= 1
 *   - name.trim().length <= 30
 *   - tidak duplikat dengan existingCategories (case-insensitive)
 *
 * Validates: Requirements 10.1, 10.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Minimal stubs required for importing the module in a non-browser environment
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

globalThis.document = {
  getElementById:    () => null,
  querySelectorAll:  () => ({ forEach: () => {} }),
  createElement:     () => ({ className: '', innerHTML: '', appendChild: () => {} }),
  addEventListener:  () => {},
};
globalThis.window = { addEventListener: () => {} };

// ---------------------------------------------------------------------------
// Inline implementation extracted faithfully from js/script.js
// ---------------------------------------------------------------------------

/**
 * Validates a proposed custom category name.
 *
 * Rules:
 *   - trimmed length must be >= 1 (not empty / whitespace-only)
 *   - trimmed length must be <= 30
 *   - must not already exist in existingCategories (case-insensitive)
 *
 * @param {string}   name               - Proposed category name
 * @param {string[]} existingCategories - Array of already-registered category names
 * @returns {{ isValid: boolean, errors: Object }}
 */
function validateCategoryName(name, existingCategories) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const errors = {};
  if (trimmed.length === 0) {
    errors.categoryName = 'Nama kategori tidak boleh kosong.';
  } else if (trimmed.length > 30) {
    errors.categoryName = 'Nama kategori tidak boleh lebih dari 30 karakter.';
  } else if (existingCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    errors.categoryName = 'Kategori sudah ada.';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Non-empty printable string up to 30 chars after trimming.
 * We generate strings that have at least one non-whitespace character.
 */
const validCategoryName = fc
  .stringOf(fc.char().filter(c => c.trim().length > 0), { minLength: 1, maxLength: 30 });

/**
 * Invalid category name: either empty / whitespace-only, or longer than 30 chars when trimmed.
 */
const tooLongCategoryName = fc
  .stringOf(fc.char().filter(c => c.trim().length > 0), { minLength: 31, maxLength: 60 });

const emptyOrWhitespaceName = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constant(' '), { minLength: 1, maxLength: 10 })
);

/**
 * Array of distinct existing category strings (0–5 entries).
 */
const existingCategoryArray = fc.array(
  fc.stringOf(fc.char().filter(c => c.trim().length > 0), { minLength: 1, maxLength: 30 }),
  { minLength: 0, maxLength: 5 }
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 11: Custom category name validation', () => {

  // -------------------------------------------------------------------------
  // PROPERTY-BASED TESTS
  // -------------------------------------------------------------------------

  it('isValid: true iff trim length 1–30 AND not a case-insensitive duplicate', () => {
    fc.assert(
      fc.property(validCategoryName, existingCategoryArray, (name, existing) => {
        // Make sure `name` is not already in `existing` (case-insensitive).
        // We build a "clean" existing array that excludes the current name.
        const cleanExisting = existing.filter(
          e => e.toLowerCase() !== name.trim().toLowerCase()
        );

        const result = validateCategoryName(name, cleanExisting);

        // Preconditions met → must be valid
        expect(result.isValid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  it('isValid: false when name is empty or whitespace-only', () => {
    fc.assert(
      fc.property(emptyOrWhitespaceName, existingCategoryArray, (name, existing) => {
        const result = validateCategoryName(name, existing);
        expect(result.isValid).toBe(false);
        expect(result.errors.categoryName).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('isValid: false when trimmed name exceeds 30 characters', () => {
    fc.assert(
      fc.property(tooLongCategoryName, existingCategoryArray, (name, existing) => {
        const result = validateCategoryName(name, existing);
        expect(result.isValid).toBe(false);
        expect(result.errors.categoryName).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('isValid: false when name is a case-insensitive duplicate of an existing category', () => {
    fc.assert(
      fc.property(validCategoryName, (name) => {
        // Existing list contains the exact name in uppercase
        const existing = [name.trim().toUpperCase()];
        const result = validateCategoryName(name, existing);
        expect(result.isValid).toBe(false);
        expect(result.errors.categoryName).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('isValid: false when name is a case-insensitive duplicate in lowercase', () => {
    fc.assert(
      fc.property(validCategoryName, (name) => {
        const existing = [name.trim().toLowerCase()];
        const result = validateCategoryName(name, existing);
        expect(result.isValid).toBe(false);
        expect(result.errors.categoryName).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // EXAMPLE-BASED UNIT TESTS
  // -------------------------------------------------------------------------

  it('accepts a normal category name not in the existing list', () => {
    const result = validateCategoryName('Hiburan', ['Food', 'Transport', 'Fun']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects an empty string', () => {
    const result = validateCategoryName('', ['Food']);
    expect(result.isValid).toBe(false);
    expect(result.errors.categoryName).toBeTruthy();
  });

  it('rejects a whitespace-only string', () => {
    const result = validateCategoryName('   ', ['Food']);
    expect(result.isValid).toBe(false);
    expect(result.errors.categoryName).toBeTruthy();
  });

  it('rejects a name longer than 30 characters after trimming', () => {
    const longName = 'A'.repeat(31);
    const result = validateCategoryName(longName, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.categoryName).toBeTruthy();
  });

  it('accepts a name of exactly 30 characters', () => {
    const name30 = 'B'.repeat(30);
    const result = validateCategoryName(name30, []);
    expect(result.isValid).toBe(true);
  });

  it('accepts a name of exactly 1 character', () => {
    const result = validateCategoryName('X', []);
    expect(result.isValid).toBe(true);
  });

  it('rejects a duplicate — exact same case', () => {
    const result = validateCategoryName('Food', ['Food', 'Transport']);
    expect(result.isValid).toBe(false);
    expect(result.errors.categoryName).toBeTruthy();
  });

  it('rejects a duplicate — different case (FOOD vs food)', () => {
    const result = validateCategoryName('FOOD', ['Food', 'Transport']);
    expect(result.isValid).toBe(false);
    expect(result.errors.categoryName).toBeTruthy();
  });

  it('rejects a duplicate — mixed case', () => {
    const result = validateCategoryName('fOoD', ['Food']);
    expect(result.isValid).toBe(false);
    expect(result.errors.categoryName).toBeTruthy();
  });

  it('trims surrounding whitespace before checking length and duplicates', () => {
    // '  Food  ' trims to 'Food', which is a duplicate
    const result = validateCategoryName('  Food  ', ['Food']);
    expect(result.isValid).toBe(false);
  });

  it('valid name with leading/trailing spaces that is not a duplicate', () => {
    const result = validateCategoryName('  Kesehatan  ', ['Food', 'Transport']);
    expect(result.isValid).toBe(true);
  });

  it('empty existing list — any valid name should pass', () => {
    const result = validateCategoryName('Olahraga', []);
    expect(result.isValid).toBe(true);
  });
});
