'use strict';

/* ==========================================================================
   Expense & Budget Visualizer — js/script.js
   Modules: StorageManager, Validator, Formatter, AppState,
            Chart, Render, EventHandlers, init()
   ========================================================================== */


// ============================================================================
// === STORAGE MANAGER MODULE (task 4.1) ===
// ============================================================================

/** Key digunakan untuk menyimpan transaksi di localStorage */
const STORAGE_KEY = 'ebv_transactions';

/**
 * Menyimpan array transaksi ke localStorage sebagai JSON.
 *
 * @param {Array} transactions - Array objek Transaction yang akan disimpan
 * @returns {{ success: boolean, error?: string }}
 */
function saveTransactions(transactions) {
  try {
    const json = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY, json);
    return { success: true };
  } catch (err) {
    // Tangkap SecurityError (private browsing / iframe sandbox) dan
    // QuotaExceededError (storage penuh)
    if (
      err instanceof DOMException &&
      (err.name === 'SecurityError' ||
        err.name === 'QuotaExceededError' ||
        err.code === 22 ||      // QuotaExceededError code di beberapa browser
        err.code === 1014)      // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
    ) {
      return {
        success: false,
        error: 'Gagal menyimpan data: ' + err.message
      };
    }
    // Error tak terduga lainnya
    return {
      success: false,
      error: 'Gagal menyimpan data: ' + (err.message || String(err))
    };
  }
}

/**
 * Membaca dan mem-parse transaksi dari localStorage.
 * Mengembalikan array kosong jika storage tidak tersedia atau data corrupt.
 *
 * @returns {{ transactions: Array, error?: string }}
 */
function loadTransactions() {
  let raw;

  // Tangkap SecurityError jika localStorage tidak tersedia
  // (misal: mode privat di beberapa browser, atau iframe sandbox)
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return {
      transactions: [],
      error: 'localStorage tidak tersedia: ' + (err.message || String(err))
    };
  }

  // Belum ada data tersimpan — bukan error
  if (raw === null) {
    return { transactions: [] };
  }

  // Parse JSON, tangkap data corrupt
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      transactions: [],
      error: 'Data tersimpan tidak valid (corrupt JSON), memulai ulang dengan data kosong.'
    };
  }

  // Pastikan hasil parse adalah array
  if (!Array.isArray(parsed)) {
    return {
      transactions: [],
      error: 'Data tersimpan tidak valid (bukan array), memulai ulang dengan data kosong.'
    };
  }

  return { transactions: parsed };
}


// ============================================================================
// === VALIDATOR MODULE (task 5.1) ===
// ============================================================================

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether all fields passed validation
 * @property {Object}  errors  - Per-field error messages; only keys present for invalid fields
 * @property {string}  [errors.itemName]  - Error message for itemName, if invalid
 * @property {string}  [errors.amount]   - Error message for amount, if invalid
 * @property {string}  [errors.category] - Error message for category, if invalid
 */

/**
 * Validates a transaction's input fields.
 *
 * Pure function — no DOM access, no side effects.
 *
 * Rules:
 *   itemName  – must not be empty or whitespace-only; max 100 characters
 *   amount    – must be a finite number greater than 0; max 999,999,999.99
 *   category  – must not be empty string (the placeholder <option> has value="")
 *
 * @param {string}        itemName  - The name of the expense item
 * @param {string|number} amount    - The expense amount (may arrive as a string from form inputs)
 * @param {string}        category  - The selected category value
 * @returns {ValidationResult}
 */
function validateTransaction(itemName, amount, category) {
  const errors = {};

  // --- itemName validation ---
  const trimmedName = typeof itemName === 'string' ? itemName.trim() : '';
  if (trimmedName.length === 0) {
    errors.itemName = 'Nama item tidak boleh kosong.';
  } else if (trimmedName.length > 100) {
    errors.itemName = 'Nama item tidak boleh lebih dari 100 karakter.';
  }

  // --- amount validation ---
  // Accept strings (from <input type="number">) by converting via Number()
  const numericAmount = Number(amount);
  if (amount === '' || amount === null || amount === undefined || isNaN(numericAmount) || !isFinite(numericAmount)) {
    errors.amount = 'Jumlah harus berupa angka yang valid.';
  } else if (numericAmount <= 0) {
    errors.amount = 'Jumlah harus lebih dari 0.';
  } else if (numericAmount > 999999999.99) {
    errors.amount = 'Jumlah tidak boleh melebihi 999.999.999,99.';
  }

  // --- category validation ---
  // The default/placeholder <option> has value="" — treat empty string as "not selected"
  const trimmedCategory = typeof category === 'string' ? category.trim() : '';
  if (trimmedCategory.length === 0) {
    errors.category = 'Pilih kategori yang valid.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// validateSpendingLimit(value)                    [opsional — task 16.1]

// === TASK 13.1: Custom Categories ===
const CATEGORIES_KEY = 'ebv_categories';
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

function getCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [...DEFAULT_CATEGORIES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_CATEGORIES];
  } catch (e) {
    return [...DEFAULT_CATEGORIES];
  }
}

function saveCategories(categories) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) { /* silent */ }
}

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

function addCustomCategory(name) {
  const categories = getCategories();
  const result = validateCategoryName(name, categories);
  if (!result.isValid) {
    showError(result.errors.categoryName, 'error-custom-category');
    return false;
  }
  categories.push(name.trim());
  saveCategories(categories);
  renderCategoryOptions();
  // Clear the input
  const input = document.getElementById('input-custom-category');
  if (input) input.value = '';
  return true;
}

function renderCategoryOptions() {
  const select = document.getElementById('input-category');
  if (!select) return;
  const categories = getCategories();
  // Keep the placeholder option, replace the rest
  const placeholder = select.options[0];
  select.innerHTML = '';
  select.appendChild(placeholder);
  categories.forEach(function(cat) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}


// ============================================================================
// === FORMATTER MODULE (task 6.1) ===
// ============================================================================
// Pure functions for formatting display data.
// No side effects — safe to call from any context.

/**
 * Formats a number as Indonesian Rupiah currency string.
 * Uses dots as thousands separators, no decimal places.
 *
 * Examples:
 *   formatRupiah(1250000) → "Rp 1.250.000"
 *   formatRupiah(500)     → "Rp 500"
 *   formatRupiah(0)       → "Rp 0"
 *
 * @param {number} amount - A non-negative number (integer or float)
 * @returns {string} Formatted Rupiah string
 */
function formatRupiah(amount) {
  // Use Math.floor to drop any decimal part
  const integer = Math.floor(amount);

  // Edge case: zero
  if (integer === 0) return 'Rp 0';

  // Convert to string and insert dots every 3 digits from the right
  const formatted = integer
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return 'Rp ' + formatted;
}

/**
 * Returns the hex color associated with a spending category.
 * Falls back to a default earth-tone color for unknown categories.
 *
 * Mapping:
 *   "Food"      → "#A47148"
 *   "Transport" → "#8A9A5B"
 *   "Fun"       → "#C97C5D"
 *   (other)     → "#B5654A"  (fallback / terracotta-dark)
 *
 * @param {string} category - Category name
 * @returns {string} Hex color string
 */
function getColorForCategory(category) {
  const colorMap = {
    'Food':      '#A47148',
    'Transport': '#8A9A5B',
    'Fun':       '#C97C5D',
  };

  return colorMap[category] || '#B5654A';
}

/**
 * Formats a chart label combining category name and percentage.
 * Percentage is always shown with exactly 1 decimal place.
 *
 * Examples:
 *   formatChartLabel("Food", 45.2)    → "Food (45.2%)"
 *   formatChartLabel("Transport", 10) → "Transport (10.0%)"
 *
 * @param {string} category   - Category name
 * @param {number} percentage - Percentage value (0–100)
 * @returns {string} Formatted label string
 */
function formatChartLabel(category, percentage) {
  return `${category} (${percentage.toFixed(1)}%)`;
}


// ============================================================================
// === APP STATE ===
// ============================================================================

const AppState = {
  transactions: [],    // Transaction[]
  chartInstance: null  // Chart.js instance aktif | null
};


// ============================================================================
// === CORE APP LOGIC (task 7.x) ===
// ============================================================================

/**
 * Membuat objek Transaction baru, menyimpannya ke AppState dan localStorage,
 * lalu memperbarui UI.
 *
 * @param {string} itemName  - Nama item pengeluaran (sudah tervalidasi)
 * @param {number|string} amount - Jumlah pengeluaran (akan dikonversi ke number)
 * @param {string} category  - Kategori pengeluaran
 */
function createTransaction(itemName, amount, category) {
  const transaction = {
    id: `${Date.now()}-${Math.random()}`,
    itemName: itemName,
    amount: Number(amount),
    category: category,
    timestamp: new Date().toISOString()
  };

  AppState.transactions.push(transaction);
  saveTransactions(AppState.transactions);
  renderAll();
}

/**
 * Menghapus transaksi dengan id tertentu dari AppState dan localStorage,
 * lalu memperbarui UI.
 *
 * @param {string} id - ID transaksi yang akan dihapus
 */
function deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(
    function (t) { return t.id !== id; }
  );
  saveTransactions(AppState.transactions);
  renderAll();
}

/**
 * Menghitung total semua amount dan menampilkannya di #balance-amount.
 * Menampilkan "Rp 0" jika tidak ada transaksi.
 */
function renderBalance() {
  const el = document.getElementById('balance-amount');
  if (!el) return;

  if (AppState.transactions.length === 0) {
    el.textContent = 'Rp 0';
    return;
  }

  const total = AppState.transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  el.textContent = formatRupiah(total);
}

/**
 * Menghapus dan merender ulang seluruh daftar transaksi di #transaction-list.
 * Menampilkan #list-empty-message jika tidak ada transaksi.
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  const emptyMsg = document.getElementById('list-empty-message');
  if (!list) return;

  // Kosongkan list
  list.innerHTML = '';

  if (AppState.transactions.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  // Sembunyikan pesan kosong
  if (emptyMsg) emptyMsg.style.display = 'none';

  // Render setiap transaksi sebagai <li>
  AppState.transactions.forEach(function (t) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.innerHTML =
      '<span class="transaction-name">' + t.itemName + '</span>' +
      '<span class="transaction-amount">' + formatRupiah(t.amount) + '</span>' +
      '<span class="transaction-category">' + t.category + '</span>' +
      '<button class="btn-delete" data-id="' + t.id + '" aria-label="Hapus ' + t.itemName + '">Hapus</button>';
    list.appendChild(li);
  });
}

// === TASK 14.1: Monthly Summary ===

/**
 * Groups transactions by month-year and sums amounts.
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

/**
 * Renders monthly summary section.
 */
function renderMonthlySummary() {
  const container = document.getElementById('monthly-summary-list');
  if (!container) return;

  const grouped = groupByMonth(AppState.transactions);
  const keys = Object.keys(grouped).sort().reverse(); // newest first

  if (keys.length === 0) {
    container.innerHTML = '<p class="summary-empty">Belum ada data ringkasan.</p>';
    return;
  }

  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni',
                      'Juli','Agustus','September','Oktober','November','Desember'];

  container.innerHTML = keys.map(function(key) {
    const parts = key.split('-');
    const year = parts[0];
    const month = monthNames[parseInt(parts[1], 10) - 1];
    return '<div class="summary-item">' +
      '<span class="summary-month">' + month + ' ' + year + '</span>' +
      '<span class="summary-total">' + formatRupiah(grouped[key]) + '</span>' +
    '</div>';
  }).join('');
}

/**
 * Merender ulang semua komponen UI: balance, daftar transaksi, dan chart.
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart(AppState.transactions);
  renderMonthlySummary();
}

/**
 * Menampilkan pesan error pada elemen dengan id tertentu.
 *
 * @param {string} message   - Teks pesan error
 * @param {string} elementId - ID elemen target
 */
function showError(message, elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

/**
 * Menyembunyikan dan mengosongkan semua elemen error di halaman.
 */
function clearErrors() {
  document.querySelectorAll('.error-message, .error-banner').forEach(function (el) {
    el.textContent = '';
    el.style.display = 'none';
  });
}


// ============================================================================
// === CHART MODULE (task 9.x) ===
// ============================================================================

/**
 * Prepares pie chart data from a transaction array.
 * Groups by category, sums amounts, filters out zero totals.
 *
 * @param {Array} transactions - Array of Transaction objects
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

/**
 * Merender atau memperbarui pie chart pengeluaran per kategori.
 *
 * Lifecycle:
 *   1. Jika Chart.js tidak tersedia (CDN gagal), tampilkan error dan sembunyikan
 *      #chart-section agar form & daftar transaksi tetap berfungsi.
 *   2. Jika ada instance chart sebelumnya, hancurkan dulu (.destroy()) untuk
 *      mencegah memory leak pada canvas.
 *   3. Jika tidak ada transaksi, sembunyikan canvas dan tampilkan pesan kosong.
 *   4. Buat instance Chart.js baru dengan konfigurasi pie chart lengkap.
 *
 * @param {Array} transactions - Array objek Transaction dari AppState
 */
function renderChart(transactions) {
  // --- 1. CDN fallback: Chart.js tidak tersedia ---
  if (typeof Chart === 'undefined') {
    showError(
      'Visualisasi tidak tersedia. Chart.js gagal dimuat.',
      'chart-error'
    );
    const chartSection = document.getElementById('chart-section');
    if (chartSection) chartSection.style.display = 'none';
    return;
  }

  // --- 2. Hancurkan instance lama untuk mencegah memory leak canvas ---
  if (AppState.chartInstance) {
    AppState.chartInstance.destroy();
    AppState.chartInstance = null;
  }

  const canvas = document.getElementById('expense-chart');
  const emptyMsg = document.getElementById('chart-empty-message');

  // --- 3. Tidak ada transaksi: tampilkan pesan kosong, sembunyikan canvas ---
  if (!transactions || transactions.length === 0) {
    if (canvas) canvas.style.display = 'none';
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }

  // Ada transaksi: tampilkan canvas, sembunyikan pesan kosong
  if (canvas) canvas.style.display = 'block';
  if (emptyMsg) emptyMsg.hidden = true;

  if (!canvas) return;

  // --- 4. Siapkan data dan buat Chart.js instance baru ---
  const chartData = prepareChartData(transactions);
  const ctx = canvas.getContext('2d');

  AppState.chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: chartData.colors,
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            /**
             * Label callback: tampilkan nilai formatRupiah + persentase 1 desimal.
             * Contoh: "Food: Rp 125.000 (45.2%)"
             */
            label: function(context) {
              const total = context.dataset.data.reduce(function(a, b) {
                return a + b;
              }, 0);
              const pct = ((context.raw / total) * 100).toFixed(1);
              return context.label + ': ' + formatRupiah(context.raw) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}


// ============================================================================
// === EVENT HANDLERS & INIT (task 10.x) ===
// ============================================================================

// === TASK 10.1: handleFormSubmit ===
function handleFormSubmit(event) {
  event.preventDefault();

  // Read form values
  const itemName = document.getElementById('input-item-name').value;
  const amount   = document.getElementById('input-amount').value;
  const category = document.getElementById('input-category').value;

  // Clear previous errors
  clearErrors();

  // Validate
  const result = validateTransaction(itemName, amount, category);

  if (!result.isValid) {
    // Show per-field errors
    if (result.errors.itemName) showError(result.errors.itemName, 'error-itemName');
    if (result.errors.amount)   showError(result.errors.amount,   'error-amount');
    if (result.errors.category) showError(result.errors.category, 'error-category');
    return;
  }

  // Create transaction and reset form
  createTransaction(itemName, Number(amount), category);

  document.getElementById('input-item-name').value = '';
  document.getElementById('input-amount').value    = '';
  document.getElementById('input-category').value  = '';
}

// === TASK 10.1: handleDeleteTransaction ===
function handleDeleteTransaction(id) {
  deleteTransaction(id);
}

// === TASK 10.3: init ===
function init() {
  const result = loadTransactions();

  if (result.error) {
    showError(result.error, 'error-global');
  }

  AppState.transactions = result.transactions || [];

  // Attach form submit handler
  const form = document.getElementById('transaction-form');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Delegated click handler on transaction list for delete buttons
  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', function(event) {
      const btn = event.target.closest('.btn-delete');
      if (btn) {
        const id = btn.getAttribute('data-id');
        if (id) handleDeleteTransaction(id);
      }
    });
  }

  // Initial render
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);

/**
 * Setelah semua resource (termasuk CDN scripts) selesai dimuat,
 * periksa apakah Chart.js berhasil dimuat.
 * Jika tidak, tampilkan pesan error di area chart dan sembunyikan section-nya.
 */
window.addEventListener('load', function() {
  if (typeof Chart === 'undefined') {
    showError(
      'Visualisasi tidak tersedia. Chart.js gagal dimuat.',
      'chart-error'
    );
    const chartSection = document.getElementById('chart-section');
    if (chartSection) chartSection.style.display = 'none';
  }
});

