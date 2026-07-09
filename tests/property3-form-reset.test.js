/**
 * Property 3: Form reset after valid submission
 *
 * Untuk sembarang valid (itemName, amount, category), setelah
 * handleFormSubmit dipanggil dengan sukses, nilai field #input-item-name
 * SHALL menjadi "", #input-amount SHALL menjadi "", dan #input-category
 * SHALL direset ke opsi pertama/default ("").
 *
 * Validates: Requirements 1.5
 *
 * Strategy: handleFormSubmit() reads and writes DOM elements, so we stub
 * document.getElementById with a minimal in-memory field store.
 * localStorage side-effects are also stubbed (same pattern as property2).
 * The functions under test are reproduced faithfully from js/script.js.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// In-memory field store — simulates the three <input>/<select> DOM nodes
// ---------------------------------------------------------------------------

const fields = {
  'input-item-name': { value: '' },
  'input-amount':    { value: '' },
  'input-category':  { value: '' },
};

// Elements that clearErrors / showError might touch — return a safe no-op stub
const noopEl = {
  textContent: '',
  style: { display: '' },
};

// ---------------------------------------------------------------------------
// localStorage stub
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
// document stub — routes getElementById to our field store
// ---------------------------------------------------------------------------

globalThis.document = {
  getElementById: (id) => {
    if (id in fields) return fields[id];
    // Catch-all for error nodes, canvas, etc.
    return noopEl;
  },
  querySelectorAll: () => ({ forEach: () => {} }),
  createElement:    () => ({ className: '', innerHTML: '', appendChild: () => {} }),
};

// ---------------------------------------------------------------------------
// Inline implementations extracted from js/script.js
// (logic identical — no DOM framework, no bundler dependency)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ebv_transactions';

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Gagal menyimpan: ' + (err.message || String(err)) };
  }
}

function renderAll() {
  // no-op — DOM render not needed for this property
}

const AppState = {
  transactions: [],
  chartInstance: null,
};

function createTransaction(itemName, amount, category) {
  const transaction = {
    id:        `${Date.now()}-${Math.random()}`,
    itemName:  itemName,
    amount:    Number(amount),
    category:  category,
    timestamp: new Date().toISOString(),
  };
  AppState.transactions.push(transaction);
  saveTransactions(AppState.transactions);
  renderAll();
}

function validateTransaction(itemName, amount, category) {
  const errors = {};

  const trimmedName = typeof itemName === 'string' ? itemName.trim() : '';
  if (trimmedName.length === 0) {
    errors.itemName = 'Nama item tidak boleh kosong.';
  } else if (trimmedName.length > 100) {
    errors.itemName = 'Nama item tidak boleh lebih dari 100 karakter.';
  }

  const numericAmount = Number(amount);
  if (amount === '' || amount === null || amount === undefined || isNaN(numericAmount) || !isFinite(numericAmount)) {
    errors.amount = 'Jumlah harus berupa angka yang valid.';
  } else if (numericAmount <= 0) {
    errors.amount = 'Jumlah harus lebih dari 0.';
  } else if (numericAmount > 999999999.99) {
    errors.amount = 'Jumlah tidak boleh melebihi 999.999.999,99.';
  }

  const trimmedCategory = typeof category === 'string' ? category.trim() : '';
  if (trimmedCategory.length === 0) {
    errors.category = 'Pilih kategori yang valid.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function showError(message, elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message, .error-banner').forEach(function(el) {
    el.textContent = '';
    el.style.display = 'none';
  });
}

/**
 * Exact copy of handleFormSubmit from js/script.js.
 * Reads from fields store, validates, creates transaction, resets fields.
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const itemName = document.getElementById('input-item-name').value;
  const amount   = document.getElementById('input-amount').value;
  const category = document.getElementById('input-category').value;

  clearErrors();

  const result = validateTransaction(itemName, amount, category);

  if (!result.isValid) {
    if (result.errors.itemName) showError(result.errors.itemName, 'error-itemName');
    if (result.errors.amount)   showError(result.errors.amount,   'error-amount');
    if (result.errors.category) showError(result.errors.category, 'error-category');
    return;
  }

  createTransaction(itemName, Number(amount), category);

  document.getElementById('input-item-name').value = '';
  document.getElementById('input-amount').value    = '';
  document.getElementById('input-category').value  = '';
}

// Minimal fake event that satisfies event.preventDefault()
const fakeEvent = { preventDefault: () => {} };

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid itemName: non-whitespace, 1–100 chars */
const validItemName = fc.stringOf(
  fc.char().filter((c) => c.trim().length > 0),
  { minLength: 1, maxLength: 100 }
);

/** Valid amount as numeric string: positive, within app max */
const validAmountStr = fc
  .double({ min: 0.01, max: 999_999_999.99, noNaN: true, noDefaultInfinity: true })
  .filter((n) => n > 0)
  .map((n) => String(n));

/** Valid category: one of the three supported values */
const validCategory = fc.constantFrom('Food', 'Transport', 'Fun');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 3: Form reset after valid submission', () => {
  beforeEach(() => {
    AppState.transactions = [];
    localStorageStub.clear();
    // Reset field store to simulate a freshly filled-in form (values set by test)
    fields['input-item-name'].value = '';
    fields['input-amount'].value    = '';
    fields['input-category'].value  = '';
  });

  // --- Property-based test ---

  it('for any valid (itemName, amount, category), form fields are reset to "" after successful submit', () => {
    // **Validates: Requirements 1.5**
    fc.assert(
      fc.property(validItemName, validAmountStr, validCategory, (itemName, amount, category) => {
        // Pre-condition: simulate user filling the form
        fields['input-item-name'].value = itemName;
        fields['input-amount'].value    = amount;
        fields['input-category'].value  = category;

        handleFormSubmit(fakeEvent);

        // All three fields must be reset to ""
        expect(fields['input-item-name'].value).toBe('');
        expect(fields['input-amount'].value).toBe('');
        expect(fields['input-category'].value).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  // --- Example-based unit tests ---

  it('resets itemName field after valid submit', () => {
    fields['input-item-name'].value = 'Makan siang';
    fields['input-amount'].value    = '35000';
    fields['input-category'].value  = 'Food';

    handleFormSubmit(fakeEvent);

    expect(fields['input-item-name'].value).toBe('');
  });

  it('resets amount field after valid submit', () => {
    fields['input-item-name'].value = 'Tiket busway';
    fields['input-amount'].value    = '12500';
    fields['input-category'].value  = 'Transport';

    handleFormSubmit(fakeEvent);

    expect(fields['input-amount'].value).toBe('');
  });

  it('resets category field after valid submit', () => {
    fields['input-item-name'].value = 'Nonton';
    fields['input-amount'].value    = '75000';
    fields['input-category'].value  = 'Fun';

    handleFormSubmit(fakeEvent);

    expect(fields['input-category'].value).toBe('');
  });

  it('does NOT reset fields when itemName is empty (invalid input)', () => {
    fields['input-item-name'].value = '';        // invalid
    fields['input-amount'].value    = '50000';
    fields['input-category'].value  = 'Food';

    handleFormSubmit(fakeEvent);

    // Validation failed — fields remain unchanged
    expect(fields['input-item-name'].value).toBe('');    // was already ''
    expect(fields['input-amount'].value).toBe('50000');  // untouched
    expect(fields['input-category'].value).toBe('Food'); // untouched
  });

  it('does NOT reset fields when amount is invalid (zero)', () => {
    fields['input-item-name'].value = 'Kopi';
    fields['input-amount'].value    = '0';       // invalid
    fields['input-category'].value  = 'Food';

    handleFormSubmit(fakeEvent);

    expect(fields['input-item-name'].value).toBe('Kopi');
    expect(fields['input-amount'].value).toBe('0');
    expect(fields['input-category'].value).toBe('Food');
  });

  it('does NOT reset fields when category is empty string (placeholder, invalid)', () => {
    fields['input-item-name'].value = 'Bensin';
    fields['input-amount'].value    = '50000';
    fields['input-category'].value  = '';        // invalid (placeholder)

    handleFormSubmit(fakeEvent);

    expect(fields['input-item-name'].value).toBe('Bensin');
    expect(fields['input-amount'].value).toBe('50000');
    expect(fields['input-category'].value).toBe('');
  });

  it('resets all three fields to "" simultaneously (not just one)', () => {
    fields['input-item-name'].value = 'Parkir';
    fields['input-amount'].value    = '5000';
    fields['input-category'].value  = 'Transport';

    handleFormSubmit(fakeEvent);

    const allReset =
      fields['input-item-name'].value === '' &&
      fields['input-amount'].value    === '' &&
      fields['input-category'].value  === '';

    expect(allReset).toBe(true);
  });

  it('transaction is created in AppState before fields are reset', () => {
    AppState.transactions = [];
    fields['input-item-name'].value = 'Snack';
    fields['input-amount'].value    = '8000';
    fields['input-category'].value  = 'Food';

    handleFormSubmit(fakeEvent);

    // Transaction was created
    expect(AppState.transactions).toHaveLength(1);
    expect(AppState.transactions[0].itemName).toBe('Snack');

    // And fields were reset
    expect(fields['input-item-name'].value).toBe('');
    expect(fields['input-amount'].value).toBe('');
    expect(fields['input-category'].value).toBe('');
  });

  it('handles item name with exactly 100 characters — resets correctly', () => {
    const longName = 'B'.repeat(100);
    fields['input-item-name'].value = longName;
    fields['input-amount'].value    = '1000';
    fields['input-category'].value  = 'Fun';

    handleFormSubmit(fakeEvent);

    expect(fields['input-item-name'].value).toBe('');
    expect(fields['input-amount'].value).toBe('');
    expect(fields['input-category'].value).toBe('');
  });
});
