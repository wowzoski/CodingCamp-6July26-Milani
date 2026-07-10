'use strict';

/* ==========================================================================
   Expense & Budget Visualizer — js/script.js
   Modules: StorageManager, Validator, Formatter, AppState,
            Chart, Render, EventHandlers, init()
   ========================================================================== */


// ============================================================================
// === STORAGE MANAGER MODULE (task 4.1) ===
// ============================================================================

const STORAGE_KEY = 'ebv_transactions';

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return { success: true };
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'SecurityError' || err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
      return { success: false, error: 'Gagal menyimpan data: ' + err.message };
    }
    return { success: false, error: 'Gagal menyimpan data: ' + (err.message || String(err)) };
  }
}

function loadTransactions() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return { transactions: [], error: 'localStorage tidak tersedia: ' + (err.message || String(err)) };
  }
  if (raw === null) return { transactions: [] };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { transactions: [], error: 'Data tersimpan tidak valid (corrupt JSON), memulai ulang dengan data kosong.' };
  }
  if (!Array.isArray(parsed)) {
    return { transactions: [], error: 'Data tersimpan tidak valid (bukan array), memulai ulang dengan data kosong.' };
  }
  return { transactions: parsed };
}


// ============================================================================
// === VALIDATOR MODULE (task 5.1) ===
// ============================================================================

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


// ============================================================================
// === SPENDING LIMIT MODULE (task 16.1) ===
// ============================================================================

const LIMITS_KEY = 'ebv_limits';

function validateSpendingLimit(value) {
  const num = Number(value);
  if (value === '' || isNaN(num) || !isFinite(num)) return { isValid: false, error: 'Batas harus berupa angka yang valid.' };
  if (num <= 0) return { isValid: false, error: 'Batas harus lebih dari 0.' };
  if (num > 999999999) return { isValid: false, error: 'Batas tidak boleh melebihi 999.999.999.' };
  return { isValid: true };
}

function getLimits() {
  try {
    const raw = localStorage.getItem(LIMITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) { return {}; }
}

function saveLimits(limits) {
  try { localStorage.setItem(LIMITS_KEY, JSON.stringify(limits)); } catch (e) { /* silent */ }
}

function isOverLimit(categoryTotal, limit) {
  return categoryTotal > limit;
}

function renderLimitList() {
  const container = document.getElementById('limit-list');
  if (!container) return;
  const limits = getLimits();
  const keys = Object.keys(limits);
  if (keys.length === 0) {
    container.innerHTML = '<p class="summary-empty">Belum ada batas yang ditetapkan.</p>';
    return;
  }
  container.innerHTML = keys.map(function(cat) {
    return '<div class="limit-item"><span class="limit-category">' + cat + '</span><span class="limit-amount">' + formatRupiah(limits[cat]) + '</span></div>';
  }).join('');
}


// ============================================================================
// === CUSTOM CATEGORIES MODULE (task 13.1) ===
// ============================================================================

const CATEGORIES_KEY = 'ebv_categories';
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

function getCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [...DEFAULT_CATEGORIES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_CATEGORIES];
  } catch (e) { return [...DEFAULT_CATEGORIES]; }
}

function saveCategories(categories) {
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories)); } catch (e) { /* silent */ }
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
  if (!result.isValid) { showError(result.errors.categoryName, 'error-custom-category'); return false; }
  categories.push(name.trim());
  saveCategories(categories);
  renderCategoryOptions();
  const input = document.getElementById('input-custom-category');
  if (input) input.value = '';
  return true;
}

function renderCategoryOptions() {
  const select = document.getElementById('input-category');
  if (!select) return;
  const categories = getCategories();
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
// === THEME MODULE (task 17.1) ===
// ============================================================================

const THEME_KEY = 'ebv_theme';

function saveThemePreference(mode) {
  localStorage.setItem(THEME_KEY, mode);
}

function loadThemePreference() {
  return localStorage.getItem(THEME_KEY);
}

function applyTheme(mode) {
  if (mode === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
}


// ============================================================================
// === FORMATTER MODULE (task 6.1) ===
// ============================================================================

function formatRupiah(amount) {
  const integer = Math.floor(amount);
  if (integer === 0) return 'Rp 0';
  return 'Rp ' + integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getColorForCategory(category) {
  const colorMap = { 'Food': '#A47148', 'Transport': '#8A9A5B', 'Fun': '#C97C5D' };
  return colorMap[category] || '#B5654A';
}

function formatChartLabel(category, percentage) {
  return `${category} (${percentage.toFixed(1)}%)`;
}


// ============================================================================
// === APP STATE ===
// ============================================================================

const AppState = {
  transactions: [],
  chartInstance: null,
  sortOrder: 'default'
};


// ============================================================================
// === SORT MODULE (task 15.1) ===
// ============================================================================

function getSortedTransactions(transactions) {
  const copy = transactions.slice();
  switch (AppState.sortOrder) {
    case 'amount-asc':   return copy.sort(function(a, b) { return a.amount - b.amount; });
    case 'amount-desc':  return copy.sort(function(a, b) { return b.amount - a.amount; });
    case 'category-asc': return copy.sort(function(a, b) { return a.category.localeCompare(b.category); });
    default:             return copy;
  }
}


// ============================================================================
// === CORE APP LOGIC (task 7.x) ===
// ============================================================================

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

function deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(function(t) { return t.id !== id; });
  saveTransactions(AppState.transactions);
  renderAll();
}

function renderBalance() {
  const el = document.getElementById('balance-amount');
  if (!el) return;
  if (AppState.transactions.length === 0) { el.textContent = 'Rp 0'; return; }
  const total = AppState.transactions.reduce(function(sum, t) { return sum + t.amount; }, 0);
  el.textContent = formatRupiah(total);
}

function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  const emptyMsg = document.getElementById('list-empty-message');
  if (!list) return;
  list.innerHTML = '';
  if (AppState.transactions.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  const categoryTotals = {};
  AppState.transactions.forEach(function(t) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const limits = getLimits();

  const sorted = getSortedTransactions(AppState.transactions);
  sorted.forEach(function(t) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    if (limits[t.category] !== undefined && isOverLimit(categoryTotals[t.category], limits[t.category])) {
      li.classList.add('over-limit');
    }
    li.innerHTML =
      '<span class="transaction-name">' + t.itemName + '</span>' +
      '<span class="transaction-amount">' + formatRupiah(t.amount) + '</span>' +
      '<span class="transaction-category">' + t.category + '</span>' +
      '<button class="btn-delete" data-id="' + t.id + '" aria-label="Hapus ' + t.itemName + '">Hapus</button>';
    list.appendChild(li);
  });
}

function groupByMonth(transactions) {
  const result = {};
  transactions.forEach(function(t) {
    const d = new Date(t.timestamp);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    result[key] = (result[key] || 0) + t.amount;
  });
  return result;
}

function renderMonthlySummary() {
  const container = document.getElementById('monthly-summary-list');
  if (!container) return;
  const grouped = groupByMonth(AppState.transactions);
  const keys = Object.keys(grouped).sort().reverse();
  if (keys.length === 0) { container.innerHTML = '<p class="summary-empty">Belum ada data ringkasan.</p>'; return; }
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  container.innerHTML = keys.map(function(key) {
    const parts = key.split('-');
    return '<div class="summary-item"><span class="summary-month">' + monthNames[parseInt(parts[1], 10) - 1] + ' ' + parts[0] + '</span><span class="summary-total">' + formatRupiah(grouped[key]) + '</span></div>';
  }).join('');
}

function renderOverLimitAlert() {
  const el = document.getElementById('over-limit-alert');
  if (!el) return;

  const limits = getLimits();
  const limitKeys = Object.keys(limits);
  if (limitKeys.length === 0 || AppState.transactions.length === 0) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }

  // Compute category totals
  const categoryTotals = {};
  AppState.transactions.forEach(function(t) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  // Find over-limit categories
  const overCategories = limitKeys.filter(function(cat) {
    return categoryTotals[cat] !== undefined && isOverLimit(categoryTotals[cat], limits[cat]);
  });

  if (overCategories.length === 0) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }

  const messages = overCategories.map(function(cat) {
    return cat + ' (' + formatRupiah(categoryTotals[cat]) + ' / batas ' + formatRupiah(limits[cat]) + ')';
  });

  el.textContent = '⚠️ Batas pengeluaran terlampaui: ' + messages.join(', ');
  el.style.display = 'block';
}

function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart(AppState.transactions);
  renderMonthlySummary();
  renderLimitList();
  renderOverLimitAlert();
}

function showError(message, elementId) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = message; el.style.display = 'block'; }
}

function clearErrors() {
  document.querySelectorAll('.error-message, .error-banner').forEach(function(el) {
    el.textContent = '';
    el.style.display = 'none';
  });
}


// ============================================================================
// === CHART MODULE (task 9.x) ===
// ============================================================================

function prepareChartData(transactions) {
  const totals = {};
  transactions.forEach(function(t) {
    if (!totals[t.category]) totals[t.category] = 0;
    totals[t.category] += t.amount;
  });
  const labels = [], data = [], colors = [];
  Object.keys(totals).forEach(function(category) {
    if (totals[category] > 0) {
      labels.push(category);
      data.push(totals[category]);
      colors.push(getColorForCategory(category));
    }
  });
  return { labels, data, colors };
}

function renderChart(transactions) {
  if (typeof Chart === 'undefined') {
    showError('Visualisasi tidak tersedia. Chart.js gagal dimuat.', 'chart-error');
    const chartSection = document.getElementById('chart-section');
    if (chartSection) chartSection.style.display = 'none';
    return;
  }
  if (AppState.chartInstance) { AppState.chartInstance.destroy(); AppState.chartInstance = null; }
  const canvas = document.getElementById('expense-chart');
  const emptyMsg = document.getElementById('chart-empty-message');
  if (!transactions || transactions.length === 0) {
    if (canvas) canvas.style.display = 'none';
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  }
  if (canvas) canvas.style.display = 'block';
  if (emptyMsg) emptyMsg.hidden = true;
  if (!canvas) return;
  const chartData = prepareChartData(transactions);
  const ctx = canvas.getContext('2d');
  AppState.chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartData.labels,
      datasets: [{ data: chartData.data, backgroundColor: chartData.colors }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
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

function handleDeleteTransaction(id) {
  deleteTransaction(id);
}

function init() {
  applyTheme(loadThemePreference() || 'light');

  const result = loadTransactions();
  if (result.error) showError(result.error, 'error-global');
  AppState.transactions = result.transactions || [];

  const form = document.getElementById('transaction-form');
  if (form) form.addEventListener('submit', handleFormSubmit);

  const btnAddCategory = document.getElementById('btn-add-category');
  if (btnAddCategory) {
    btnAddCategory.addEventListener('click', function() {
      const input = document.getElementById('input-custom-category');
      const errEl = document.getElementById('error-custom-category');
      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      addCustomCategory(input ? input.value : '');
    });
  }
  renderCategoryOptions();

  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', function(event) {
      const btn = event.target.closest('.btn-delete');
      if (btn) { const id = btn.getAttribute('data-id'); if (id) handleDeleteTransaction(id); }
    });
  }

  const sortSelect = document.getElementById('sort-order');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      AppState.sortOrder = sortSelect.value;
      renderTransactionList();
    });
  }

  const btnSetLimit = document.getElementById('btn-set-limit');
  if (btnSetLimit) {
    btnSetLimit.addEventListener('click', function() {
      const catEl = document.getElementById('input-limit-category');
      const amtEl = document.getElementById('input-limit-amount');
      const errEl = document.getElementById('error-limit');
      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      const category = catEl ? catEl.value : '';
      const value    = amtEl ? amtEl.value : '';
      if (!category) {
        if (errEl) { errEl.textContent = 'Pilih kategori.'; errEl.style.display = 'block'; }
        return;
      }
      const validation = validateSpendingLimit(value);
      if (!validation.isValid) {
        if (errEl) { errEl.textContent = validation.error; errEl.style.display = 'block'; }
        return;
      }
      const limits = getLimits();
      limits[category] = Number(value);
      saveLimits(limits);
      if (amtEl) amtEl.value = '';
      renderLimitList();
      renderTransactionList();
    });
  }

  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', function() {
      const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
      saveThemePreference(next);
      applyTheme(next);
    });
  }

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('load', function() {
  if (typeof Chart === 'undefined') {
    showError('Visualisasi tidak tersedia. Chart.js gagal dimuat.', 'chart-error');
    const chartSection = document.getElementById('chart-section');
    if (chartSection) chartSection.style.display = 'none';
  }
});
