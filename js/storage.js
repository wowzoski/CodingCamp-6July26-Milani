/**
 * Storage Manager Module — ES module export for testing
 *
 * This file re-exports saveTransactions and loadTransactions so they can be
 * imported by test files running in Node.js (Vitest). The implementation is
 * identical to the functions in script.js; the browser entry point (script.js)
 * remains unchanged for the HTML app.
 */

'use strict';

/** Key used to persist transactions in localStorage */
export const STORAGE_KEY = 'ebv_transactions';

/**
 * Serialises a Transaction array to JSON and writes it to localStorage.
 *
 * @param {Array} transactions
 * @returns {{ success: boolean, error?: string }}
 */
export function saveTransactions(transactions) {
  try {
    const json = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY, json);
    return { success: true };
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'SecurityError' ||
        err.name === 'QuotaExceededError' ||
        err.code === 22 ||
        err.code === 1014)
    ) {
      return { success: false, error: 'Gagal menyimpan data: ' + err.message };
    }
    return {
      success: false,
      error: 'Gagal menyimpan data: ' + (err.message || String(err)),
    };
  }
}

/**
 * Reads and parses the Transaction array from localStorage.
 *
 * @returns {{ transactions: Array, error?: string }}
 */
export function loadTransactions() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return {
      transactions: [],
      error: 'localStorage tidak tersedia: ' + (err.message || String(err)),
    };
  }

  if (raw === null) {
    return { transactions: [] };
  }

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
