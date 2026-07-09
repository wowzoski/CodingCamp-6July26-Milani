# Design Document: Expense & Budget Visualizer

## Overview

Expense & Budget Visualizer adalah aplikasi web statis satu halaman yang memungkinkan pengguna mencatat, melihat, dan memvisualisasikan pengeluaran harian secara personal. Seluruh logika berjalan di browser menggunakan HTML, CSS, dan vanilla JavaScript — tanpa backend, tanpa build step, dan tanpa framework.

**Tujuan teknis utama:**
- Arsitektur file minimal: `index.html`, `css/style.css`, `js/script.js`
- Persistensi data via `localStorage` dengan serialisasi JSON
- Visualisasi pie chart via Chart.js (CDN)
- Layout mobile-first dengan breakpoint 768px
- Palet warna earth tone yang konsisten di seluruh komponen

**Aliran data inti:**

```
User Input → Validator → createTransaction() → Storage_Manager (localStorage)
                                    ↓
                          Re-render: Balance_Display + Transaction_List + Chart
```

---

## Architecture

### Prinsip Arsitektur

Aplikasi ini mengikuti pola **Module Pattern** dengan namespace tunggal (`AppState`) dan fungsi-fungsi murni (pure functions) yang diekspos sebagai modul dalam satu file `script.js`. Tidak ada framework reaktif — setiap mutasi state memanggil fungsi `renderAll()` yang merender ulang seluruh UI.

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Balance_Display (header)             │   │
│  ├──────────────────────────────────────────────────┤   │
│  │    Input_Form        │        Chart               │   │
│  │  (mobile: full)      │  (mobile: full, stacked)  │   │
│  ├──────────────────────────────────────────────────┤   │
│  │              Transaction_List                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────┐
         │          js/script.js             │
         │                                  │
         │  AppState { transactions[] }      │
         │                                  │
         │  ┌────────────┐  ┌────────────┐  │
         │  │  Validator  │  │  Storage   │  │
         │  │  Module     │  │  Manager   │  │
         │  └────────────┘  └────────────┘  │
         │  ┌────────────┐  ┌────────────┐  │
         │  │  Formatter  │  │  Chart     │  │
         │  │  Module     │  │  Module    │  │
         │  └────────────┘  └────────────┘  │
         │  ┌────────────────────────────┐  │
         │  │       Render Module        │  │
         │  └────────────────────────────┘  │
         └──────────────────────────────────┘
```

### Alur State

```
loadFromStorage()
       │
       ▼
AppState.transactions = []  ←───── deleteTransaction(id)
       │                                    ▲
       ▼                                    │
addTransaction(data) ───────────────────────┘
       │
       ▼
saveToStorage(AppState.transactions)
       │
       ▼
renderAll()
  ├─ renderBalance()
  ├─ renderTransactionList()
  └─ renderChart()
```

### Keputusan Desain

1. **Single source of truth**: `AppState.transactions` adalah array tunggal yang menjadi rujukan semua operasi render.
2. **Immutable ID**: Setiap transaksi mendapat `id` unik dari `Date.now() + Math.random()` agar operasi delete aman dan tidak bergantung pada index array.
3. **Re-render penuh**: Daripada melakukan DOM diff yang kompleks, `renderAll()` menghapus dan membuat ulang seluruh list setiap kali ada perubahan state. Ini cukup untuk dataset <500 item dan menyederhanakan logika.
4. **Chart.js instance management**: Instance `Chart` disimpan dalam variabel modul dan dihancurkan (`chart.destroy()`) sebelum dibuat ulang agar tidak terjadi memory leak canvas.

---

## Components and Interfaces

### 1. AppState

Objek global yang berisi state aplikasi.

```javascript
const AppState = {
  transactions: [],   // Transaction[]
  chartInstance: null // Chart | null — Chart.js instance aktif
};
```

### 2. Validator Module

Modul murni (tidak ada side effects) yang memvalidasi input form.

```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {Object} errors  — { itemName?: string, amount?: string, category?: string }
 */

/**
 * Memvalidasi input form transaksi.
 * @param {string} itemName
 * @param {string|number} amount
 * @param {string} category
 * @returns {ValidationResult}
 */
function validateTransaction(itemName, amount, category) { ... }

/**
 * Memvalidasi nama kategori kustom (nice-to-have).
 * @param {string} name
 * @param {string[]} existingCategories
 * @returns {ValidationResult}
 */
function validateCategoryName(name, existingCategories) { ... }

/**
 * Memvalidasi nilai spending limit (nice-to-have).
 * @param {number|string} value
 * @returns {ValidationResult}
 */
function validateSpendingLimit(value) { ... }
```

### 3. Storage Manager Module

Menangani semua operasi `localStorage`.

```javascript
const STORAGE_KEY = 'ebv_transactions';

/**
 * Menyimpan array transaksi ke localStorage sebagai JSON.
 * @param {Transaction[]} transactions
 * @returns {{ success: boolean, error?: string }}
 */
function saveTransactions(transactions) { ... }

/**
 * Membaca dan mem-parse transaksi dari localStorage.
 * @returns {{ transactions: Transaction[], error?: string }}
 */
function loadTransactions() { ... }
```

### 4. Formatter Module

Fungsi-fungsi pure untuk memformat data tampilan.

```javascript
/**
 * Memformat angka sebagai string mata uang Rupiah.
 * Contoh: formatRupiah(1250000) → "Rp 1.250.000"
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) { ... }

/**
 * Mengembalikan warna hex untuk kategori tertentu.
 * @param {string} category
 * @returns {string}  hex color
 */
function getColorForCategory(category) { ... }

/**
 * Memformat label chart: "Food (45.2%)"
 * @param {string} category
 * @param {number} percentage
 * @returns {string}
 */
function formatChartLabel(category, percentage) { ... }
```

### 5. Chart Module

Mengelola lifecycle Chart.js instance.

```javascript
/**
 * Menyiapkan data pie chart dari array transaksi.
 * @param {Transaction[]} transactions
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 */
function prepareChartData(transactions) { ... }

/**
 * Merender atau memperbarui pie chart.
 * @param {Transaction[]} transactions
 */
function renderChart(transactions) { ... }
```

### 6. Render Module

Fungsi-fungsi DOM manipulation.

```javascript
/** Merender ulang semua komponen UI */
function renderAll() { ... }

/** Merender Balance_Display */
function renderBalance() { ... }

/** Merender Transaction_List */
function renderTransactionList() { ... }

/** Menampilkan Error_Notification */
function showError(message, fieldId) { ... }

/** Menghapus semua Error_Notification */
function clearErrors() { ... }
```

### 7. Event Handlers

```javascript
/** Dipanggil saat form submit */
function handleFormSubmit(event) { ... }

/** Dipanggil saat tombol hapus di-klik */
function handleDeleteTransaction(id) { ... }

/** Inisialisasi app saat DOMContentLoaded */
function init() { ... }
```

---

## Data Models

### Transaction

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string} id           — Unique identifier: `${Date.now()}-${Math.random()}`
 * @property {string} itemName     — Nama item, 1–100 karakter
 * @property {number} amount       — Jumlah pengeluaran, > 0
 * @property {string} category     — "Food" | "Transport" | "Fun" | custom (nice-to-have)
 * @property {string} timestamp    — ISO 8601, contoh: "2024-01-15T10:30:00.000Z"
 */
```

**Contoh:**
```json
{
  "id": "1705312200000-0.8473621",
  "itemName": "Makan siang",
  "amount": 35000,
  "category": "Food",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### ValidationResult

```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {Object} errors
 * @property {string} [errors.itemName]
 * @property {string} [errors.amount]
 * @property {string} [errors.category]
 */
```

### ChartData

```javascript
/**
 * @typedef {Object} ChartData
 * @property {string[]} labels    — ["Food", "Transport", "Fun"]
 * @property {number[]} data      — [125000, 50000, 75000] (total per kategori)
 * @property {string[]} colors    — ["#A47148", "#8A9A5B", "#C97C5D"]
 */
```

### AppState

```javascript
/**
 * @typedef {Object} AppState
 * @property {Transaction[]} transactions
 * @property {import('chart.js').Chart|null} chartInstance
 */
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Fitur ini melibatkan logika murni (pure functions) untuk validasi, format, kalkulasi, dan transformasi data — semua cocok untuk property-based testing.

---

### Property 1: Validator rejects invalid inputs

*For any* combination of (itemName, amount, category) where at least one field is invalid (itemName is empty or whitespace-only, amount is 0 or negative, or category is the default placeholder), `validateTransaction` SHALL return `isValid: false` and identify the specific invalid fields in the `errors` object.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Valid transaction object creation

*For any* valid combination of (itemName, amount, category), calling `createTransaction(itemName, amount, category)` SHALL return a Transaction object containing: the same `itemName`, the same numeric `amount`, the same `category`, a non-empty `id` string, and a `timestamp` string that parses as a valid ISO 8601 date.

**Validates: Requirements 1.4**

---

### Property 3: Form reset after valid submission

*For any* valid form state (non-empty itemName, positive amount, selected category), after a successful form submission, the `itemName` field value SHALL be `""`, the `amount` field value SHALL be `""`, and the `category` field SHALL be reset to its first/default option.

**Validates: Requirements 1.5**

---

### Property 4: Storage round-trip

*For any* non-empty array of Transaction objects, calling `saveTransactions(transactions)` followed by `loadTransactions()` SHALL return an array that is structurally identical to the original — same length, same `id`, `itemName`, `amount`, `category`, and `timestamp` for each element.

**Validates: Requirements 2.1, 2.2**

---

### Property 5: Delete removes from storage

*For any* array of transactions with at least one element, and any valid transaction `id` within that array, after calling `deleteTransaction(id)` and then `loadTransactions()`, the returned array SHALL NOT contain any transaction with that `id`.

**Validates: Requirements 2.2, 3.4**

---

### Property 6: Corrupt storage fallback

*For any* string stored in localStorage that is not valid JSON or does not parse as an array, `loadTransactions()` SHALL return an empty `transactions` array and a non-null `error` string.

**Validates: Requirements 2.4**

---

### Property 7: Rupiah formatting correctness

*For any* non-negative integer `amount`, `formatRupiah(amount)` SHALL return a string that:
1. Starts with `"Rp "`,
2. Contains only digits and dots after `"Rp "`,
3. Uses dots as thousands separators (every 3 digits from the right),
4. Contains no decimal separator,
5. For `amount = 0`, returns exactly `"Rp 0"`.

**Validates: Requirements 4.4, 4.5**

---

### Property 8: Balance equals sum of transactions

*For any* array of Transaction objects, the computed balance displayed by `renderBalance()` SHALL equal the arithmetic sum of all `amount` values in the array (as a plain number, before formatting).

**Validates: Requirements 4.1, 4.3**

---

### Property 9: Chart data excludes zero-total categories

*For any* array of transactions, `prepareChartData(transactions)` SHALL return a `ChartData` object where every entry in `labels` corresponds to a category whose total amount is strictly greater than 0, and `data[i]` equals the exact sum of `amount` for all transactions in `labels[i]`.

**Validates: Requirements 5.1**

---

### Property 10: Category color mapping

*For any* category string, `getColorForCategory(category)` SHALL return:
- `"#A47148"` when `category === "Food"`,
- `"#8A9A5B"` when `category === "Transport"`,
- `"#C97C5D"` when `category === "Fun"`,
- `"#B5654A"` for any other value.

**Validates: Requirements 5.3**

---

### Property 11: Custom category name validation (nice-to-have)

*For any* string `name` and list of existing category names `existingCategories`, `validateCategoryName(name, existingCategories)` SHALL return `isValid: true` if and only if: `name.trim().length >= 1`, `name.trim().length <= 30`, and `name.trim().toLowerCase()` is not equal to any entry in `existingCategories.map(c => c.toLowerCase())`.

**Validates: Requirements 10.1, 10.2**

---

### Property 12: Monthly grouping aggregation (nice-to-have)

*For any* array of transactions, `groupByMonth(transactions)` SHALL return a map where each key is a `"YYYY-MM"` string and each value equals the exact arithmetic sum of `amount` for all transactions whose `timestamp` falls within that month-year.

**Validates: Requirements 10.3**

---

### Property 13: Sort order invariant (nice-to-have)

*For any* array of transactions with at least two elements:
- Sorting by `amount ascending` SHALL produce a list where `transactions[i].amount <= transactions[i+1].amount` for all valid `i`.
- Sorting by `category A-Z` SHALL produce a list where `transactions[i].category.localeCompare(transactions[i+1].category) <= 0` for all valid `i`.

**Validates: Requirements 10.4**

---

### Property 14: Spending limit threshold detection (nice-to-have)

*For any* pair `(categoryTotal: number, limit: number)` where both are positive, `isOverLimit(categoryTotal, limit)` SHALL return `true` if and only if `categoryTotal > limit`.

**Validates: Requirements 10.5**

---

### Property 15: Dark/light mode preference persistence (nice-to-have)

*For any* mode value `("light" | "dark")`, saving the preference via `saveThemePreference(mode)` and then reading it via `loadThemePreference()` SHALL return the same mode value.

**Validates: Requirements 10.7**

---

## Error Handling

### Strategi Error Handling

Semua error ditampilkan sebagai `Error_Notification` inline (bukan `alert()`). Tidak ada error yang ditelan tanpa feedback ke pengguna.

### Kategori Error

| Skenario | Komponen | Tindakan |
|---|---|---|
| Field form tidak valid | Input_Form | Tampilkan pesan error di bawah field yang tidak valid |
| localStorage tidak tersedia | App startup | Tampilkan banner error global, lanjutkan dengan state kosong |
| JSON corrupt di localStorage | App startup | Tampilkan banner error, reset ke state kosong |
| Chart.js gagal dimuat dari CDN | Chart section | Tampilkan error di area chart, form & list tetap berfungsi |
| Error saat write ke localStorage | Setelah add/delete | Tampilkan toast error, state in-memory tetap valid |

### Implementasi Error Notification

```html
<!-- Error inline di bawah field -->
<span class="error-message" id="error-itemName" role="alert"></span>

<!-- Banner error global -->
<div class="error-banner" id="error-global" role="alert" aria-live="polite"></div>
```

```javascript
function showError(message, elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message, .error-banner')
    .forEach(el => { el.textContent = ''; el.style.display = 'none'; });
}
```

### Chart.js CDN Fallback

```javascript
window.addEventListener('load', () => {
  if (typeof Chart === 'undefined') {
    showError(
      'Visualisasi tidak tersedia. Chart.js gagal dimuat.',
      'chart-error'
    );
    document.getElementById('chart-container').style.display = 'none';
  }
});
```

---

## Testing Strategy

### Pendekatan Dual Testing

Fitur ini menggunakan dua pendekatan testing yang saling melengkapi:

1. **Unit tests (example-based)**: Memverifikasi skenario spesifik, edge case, dan error condition.
2. **Property-based tests**: Memverifikasi properti universal yang berlaku untuk semua input yang valid.

### Library Testing

- **Property-based testing**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript)
- **Test runner**: [Vitest](https://vitest.dev/) atau [Jest](https://jestjs.io/)
- Minimum **100 iterasi** per property test (default fast-check: 100)

### Property Tests

Setiap property test harus diberi tag komentar yang mereferensikan properti di dokumen desain:

```javascript
// Feature: expense-budget-visualizer, Property 1: Validator rejects invalid inputs
test('validateTransaction rejects any combination with invalid fields', () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant(''), fc.string().filter(s => s.trim() === '')), // invalid itemName
    fc.float({ max: 0 }),  // invalid amount
    fc.constant(''),       // invalid category
    (itemName, amount, category) => {
      const result = validateTransaction(itemName, amount, category);
      return result.isValid === false && Object.keys(result.errors).length > 0;
    }
  ), { numRuns: 100 });
});
```

### Unit Tests (Example-Based)

```javascript
// Req 4.4: Format Rupiah
test('formatRupiah(1250000) === "Rp 1.250.000"', () => { ... });
test('formatRupiah(0) === "Rp 0"', () => { ... });
test('formatRupiah(500) === "Rp 500"', () => { ... });

// Req 5.4: Chart kosong saat tidak ada transaksi
test('Chart shows placeholder when transactions are empty', () => { ... });

// Req 3.5: Placeholder list kosong
test('Transaction_List shows placeholder when empty', () => { ... });

// Req 7.6: CDN fallback
test('App shows error when Chart.js is undefined, form still works', () => { ... });
```

### Integration Tests

```javascript
// Req 2.3: Load time < 3 detik
test('App loads within 3 seconds with 100 pre-stored transactions', () => { ... });

// Req 8.4: Performa dengan 500+ item
test('Delete operation completes in < 200ms with 500 transactions', () => { ... });
```

### Smoke Tests

Dijalankan manual atau via CI saat pertama kali deploy:

- [ ] `index.html` dapat dibuka langsung di Chrome, Firefox, Edge, Safari tanpa error console
- [ ] File `css/style.css` dan `js/script.js` ada di path yang benar
- [ ] Font Google Fonts termuat (Network tab: request ke `fonts.googleapis.com` sukses)
- [ ] Chart.js CDN termuat (Network tab: request ke CDN sukses)
- [ ] `README.md` dan `.gitignore` ada di root directory

### Matriks Coverage

| Requirement | Property Test | Unit Test | Integration | Smoke |
|---|---|---|---|---|
| 1.2 Validasi form | Property 1 | ✓ | — | — |
| 1.4 Buat transaksi | Property 2 | ✓ | — | — |
| 1.5 Reset form | Property 3 | ✓ | — | — |
| 2.1 Simpan ke storage | Property 4 | ✓ | — | — |
| 2.2 Hapus dari storage | Property 5 | ✓ | — | — |
| 2.4 Corrupt JSON | Property 6 | ✓ | — | — |
| 4.1, 4.3 Kalkulasi balance | Property 8 | ✓ | — | — |
| 4.4 Format Rupiah | Property 7 | ✓ | — | — |
| 5.1 Chart data prep | Property 9 | ✓ | — | — |
| 5.3 Warna kategori | Property 10 | ✓ | — | — |
| 2.3 Load time | — | — | ✓ | — |
| 8.4 Performa 500+ item | — | — | ✓ | — |
| 7.1 File structure | — | — | — | ✓ |
| 7.3 Cross-browser | — | — | — | ✓ |
| 9.1, 9.2 README & .gitignore | — | — | — | ✓ |

---

## Appendix: Layout & Visual Design

### HTML Structure

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <!-- Google Fonts, Chart.js CDN -->
</head>
<body>
  <!-- 1. Balance Display -->
  <header id="balance-display">
    <p>Total Pengeluaran</p>
    <h1 id="balance-amount">Rp 0</h1>
  </header>

  <!-- 2. Main content grid -->
  <main class="main-grid">
    <!-- Input Form -->
    <section id="input-form-section" class="card">
      <form id="transaction-form">
        <input type="text" id="input-item-name" maxlength="100" />
        <span class="error-message" id="error-itemName"></span>
        <input type="number" id="input-amount" min="0.01" />
        <span class="error-message" id="error-amount"></span>
        <select id="input-category">
          <option value="">Pilih kategori...</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <span class="error-message" id="error-category"></span>
        <button type="submit">Tambah</button>
      </form>
    </section>

    <!-- Chart -->
    <section id="chart-section" class="card">
      <canvas id="expense-chart"></canvas>
      <p id="chart-empty-message" hidden>Belum ada data untuk ditampilkan.</p>
      <p id="chart-error" class="error-message"></p>
    </section>
  </main>

  <!-- Transaction List -->
  <section id="transaction-list-section" class="card">
    <ul id="transaction-list"></ul>
    <p id="list-empty-message">Belum ada transaksi.</p>
  </section>

  <!-- Global error banner -->
  <div id="error-global" class="error-banner" role="alert" aria-live="polite"></div>
</body>
</html>
```

### CSS Layout

```css
/* Mobile-first base */
.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Desktop: Input_Form dan Chart berdampingan */
@media (min-width: 768px) {
  .main-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Transaction list */
#transaction-list {
  max-height: 400px;
  overflow-y: auto;
}

/* Cards */
.card {
  background: #EFE6D8;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(111, 78, 55, 0.1);
  padding: 1.25rem;
}

/* Balance display */
#balance-display {
  background: #6F4E37;
  color: #F5F0E8;
}

#balance-amount {
  font-size: clamp(24px, 5vw, 48px);
}
```

### Color Palette Reference

| Token | Hex | Digunakan pada |
|---|---|---|
| `--color-bg` | `#F5F0E8` | Background halaman |
| `--color-card` | `#EFE6D8` | Card background |
| `--color-brown-primary` | `#A47148` | Button, aksen |
| `--color-brown-dark` | `#6F4E37` | Header, teks gelap |
| `--color-sage` | `#8A9A5B` | Transport kategori |
| `--color-sage-dark` | `#6B7A5E` | Hover state sage |
| `--color-terracotta` | `#C97C5D` | Fun kategori |
| `--color-terracotta-dark` | `#B5654A` | Fallback, hover |

### Chart.js Configuration Snippet

```javascript
const chartConfig = {
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
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${formatRupiah(context.raw)} (${pct}%)`;
          }
        }
      }
    }
  }
};
```
