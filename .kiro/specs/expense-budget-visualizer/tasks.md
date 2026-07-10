# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementasi aplikasi web statis satu halaman menggunakan HTML, CSS, dan vanilla JavaScript. Alur implementasi dimulai dari scaffold proyek, fondasi CSS, struktur HTML, modul-modul JavaScript (Storage, Validator, Formatter), logika inti app, modul Chart, event handler, serta polish UI. Fitur nice-to-have ditandai opsional.

---

## Tasks

- [x] 1. Project scaffold
  - [x] 1.1 Buat struktur folder dan file stub
    - Buat folder `css/` dan `js/` di root proyek
    - Buat file kosong `index.html`, `css/style.css`, `js/script.js`
    - Buat `.gitignore` yang mengecualikan `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`
    - Buat `README.md` dengan deskripsi aplikasi, langkah menjalankan, dan minimal 3 fitur utama
    - _Requirements: 7.1, 7.2, 9.1, 9.2_

- [x] 2. CSS foundation
  - [x] 2.1 Definisikan CSS custom properties dan base styles
    - Deklarasikan semua CSS variables untuk palet earth tone: `--color-bg`, `--color-card`, `--color-brown-primary`, `--color-brown-dark`, `--color-sage`, `--color-sage-dark`, `--color-terracotta`, `--color-terracotta-dark`
    - Set typography dasar: `font-family` Poppins/Nunito dengan fallback `sans-serif`, ukuran, line-height
    - Set box-sizing, margin/padding reset pada `*`
    - Style background halaman (`#F5F0E8`), warna teks default
    - _Requirements: 6.4, 6.6_
  - [x] 2.2 Implementasi layout grid dan card styles
    - Style `.main-grid` sebagai CSS Grid `1fr` (mobile-first)
    - Tambahkan breakpoint `@media (min-width: 768px)` yang mengubah `.main-grid` menjadi `1fr 1fr`
    - Style `.card` dengan `background: #EFE6D8`, `border-radius: 14px`, `box-shadow: 0 4px 16px rgba(111,78,55,0.1)`, `padding: 1.25rem`
    - Style `#balance-display` sebagai header dengan `background: #6F4E37`, `color: #F5F0E8`
    - Style `#balance-amount` dengan `font-size: clamp(24px, 5vw, 48px)`
    - Style `#transaction-list` dengan `max-height: 400px` dan `overflow-y: auto`
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 3.3, 4.6_

- [x] 3. HTML structure
  - [x] 3.1 Susun `index.html` lengkap dengan semua section dan elemen
    - `<head>`: charset, viewport, link Google Fonts (Poppins/Nunito), link Chart.js CDN, link `css/style.css`
    - `<header id="balance-display">`: paragraf "Total Pengeluaran" + `<h1 id="balance-amount">Rp 0</h1>`
    - `<main class="main-grid">`: section `#input-form-section.card` (form dengan `#input-item-name`, `#input-amount`, `#input-category`, error spans, tombol submit) dan section `#chart-section.card` (canvas `#expense-chart`, `#chart-empty-message`, `#chart-error`)
    - `<section id="transaction-list-section" class="card">`: `<ul id="transaction-list">` + `<p id="list-empty-message">`
    - `<div id="error-global" class="error-banner" role="alert" aria-live="polite"></div>`
    - `<script src="js/script.js"></script>` di akhir body
    - _Requirements: 6.1, 1.1, 3.1, 3.5, 4.6, 5.4, 2.4, 2.5_

- [x] 4. Storage Manager module
  - [x] 4.1 Implementasi `saveTransactions` dan `loadTransactions`
    - Deklarasikan konstanta `STORAGE_KEY = 'ebv_transactions'`
    - Implementasi `saveTransactions(transactions)`: serialize ke JSON, tulis ke `localStorage`, tangkap `SecurityError`/`QuotaExceededError`, kembalikan `{ success, error? }`
    - Implementasi `loadTransactions()`: baca dari `localStorage`, parse JSON, validasi hasilnya adalah array, tangkap corrupt JSON (try/catch `JSON.parse`), tangkap `localStorage` tidak tersedia, kembalikan `{ transactions, error? }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 4.2 Tulis property test untuk Storage round-trip (Property 4)
    - **Property 4: Storage round-trip**
    - Untuk sembarang array Transaction, `saveTransactions` lalu `loadTransactions` harus mengembalikan array yang identik secara struktural
    - **Validates: Requirements 2.1, 2.2**
  - [x] 4.3 Tulis property test untuk corrupt storage fallback (Property 6)
    - **Property 6: Corrupt storage fallback**
    - Untuk sembarang string yang bukan valid JSON array, `loadTransactions` harus mengembalikan array kosong dan error string non-null
    - **Validates: Requirements 2.4**

- [x] 5. Validator module
  - [x] 5.1 Implementasi `validateTransaction`
    - Fungsi murni tanpa side effects
    - Validasi `itemName`: tidak boleh kosong atau whitespace-only, maksimal 100 karakter
    - Validasi `amount`: harus angka, lebih dari 0, maksimal 999999999.99
    - Validasi `category`: tidak boleh string kosong atau nilai placeholder
    - Kembalikan `{ isValid: boolean, errors: { itemName?, amount?, category? } }`
    - _Requirements: 1.2, 1.3_
  - [x] 5.2 Tulis property test untuk Validator rejects invalid inputs (Property 1)
    - **Property 1: Validator rejects invalid inputs**
    - Untuk sembarang kombinasi dengan minimal satu field tidak valid, `validateTransaction` harus mengembalikan `isValid: false` dan mengidentifikasi field yang salah
    - **Validates: Requirements 1.2, 1.3**

- [x] 6. Formatter module
  - [x] 6.1 Implementasi `formatRupiah`, `getColorForCategory`, `formatChartLabel`
    - `formatRupiah(amount)`: mulai dengan `"Rp "`, separator titik ribuan, tanpa desimal; `formatRupiah(0)` → `"Rp 0"`
    - `getColorForCategory(category)`: `"Food"` → `"#A47148"`, `"Transport"` → `"#8A9A5B"`, `"Fun"` → `"#C97C5D"`, lainnya → `"#B5654A"`
    - `formatChartLabel(category, percentage)`: kembalikan string `"Food (45.2%)"`
    - _Requirements: 3.1, 4.4, 4.5, 5.3, 5.5_
  - [x] 6.2 Tulis property test untuk Rupiah formatting (Property 7)
    - **Property 7: Rupiah formatting correctness**
    - Untuk sembarang bilangan bulat non-negatif, `formatRupiah` harus dimulai dengan `"Rp "`, hanya berisi digit dan titik, menggunakan titik sebagai separator ribuan, dan `formatRupiah(0)` === `"Rp 0"`
    - **Validates: Requirements 4.4, 4.5**
  - [x] 6.3 Tulis property test untuk category color mapping (Property 10)
    - **Property 10: Category color mapping**
    - Untuk sembarang string kategori, `getColorForCategory` harus mengembalikan warna hex yang tepat sesuai mapping yang didefinisikan
    - **Validates: Requirements 5.3**

- [x] 7. Core app logic
  - [x] 7.1 Definisikan `AppState` dan implementasi `createTransaction`
    - Deklarasikan `const AppState = { transactions: [], chartInstance: null }`
    - Implementasi `createTransaction(itemName, amount, category)`: buat objek Transaction dengan `id: \`${Date.now()}-${Math.random()}\``, `itemName`, `amount` (number), `category`, `timestamp` ISO 8601
    - Push ke `AppState.transactions`, panggil `saveTransactions`, panggil `renderAll()`
    - _Requirements: 1.4, 2.1_
  - [x] 7.2 Tulis property test untuk valid transaction object creation (Property 2)
    - **Property 2: Valid transaction object creation**
    - Untuk sembarang valid (itemName, amount, category), hasil `createTransaction` harus mengandung field yang sama, id non-kosong, dan timestamp ISO 8601 yang valid
    - **Validates: Requirements 1.4**
  - [x] 7.3 Implementasi `deleteTransaction`
    - Terima `id` sebagai parameter
    - Filter `AppState.transactions` untuk menghapus entri dengan `id` tersebut
    - Panggil `saveTransactions`, panggil `renderAll()`
    - _Requirements: 2.2, 3.4_
  - [x] 7.4 Tulis property test untuk delete removes from storage (Property 5)
    - **Property 5: Delete removes from storage**
    - Untuk sembarang array dengan minimal satu elemen dan id yang valid, setelah `deleteTransaction(id)` array tidak boleh mengandung transaksi dengan id tersebut
    - **Validates: Requirements 2.2, 3.4**
  - [x] 7.5 Implementasi `renderBalance`, `renderTransactionList`, `renderAll`
    - `renderBalance()`: hitung sum semua `amount` di `AppState.transactions`, format dengan `formatRupiah`, tulis ke `#balance-amount`; jika kosong tampilkan `"Rp 0"`
    - `renderTransactionList()`: hapus isi `#transaction-list`, render ulang semua item sebagai `<li>` dengan nama, `formatRupiah(amount)`, kategori, dan tombol hapus; jika kosong tampilkan `#list-empty-message`
    - `renderAll()`: panggil `renderBalance()`, `renderTransactionList()`, `renderChart()`
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 7.6 Tulis property test untuk balance equals sum of transactions (Property 8)
    - **Property 8: Balance equals sum of transactions**
    - Untuk sembarang array Transaction, nilai numerik balance harus sama persis dengan jumlah aritmetik semua `amount`
    - **Validates: Requirements 4.1, 4.3**
  - [x] 7.7 Implementasi `showError` dan `clearErrors`
    - `showError(message, elementId)`: set `textContent` dan `style.display = 'block'` pada elemen dengan id tersebut
    - `clearErrors()`: query semua `.error-message, .error-banner`, set `textContent = ''` dan `style.display = 'none'`
    - _Requirements: 1.3, 2.4, 2.5, 3.6_

- [x] 8. Checkpoint — pastikan scaffold, CSS, HTML, Storage, Validator, Formatter, dan core logic terintegrasi
  - Pastikan semua tes yang ditulis sejauh ini lulus; tanyakan ke user jika ada pertanyaan.

- [x] 9. Chart module
  - [x] 9.1 Implementasi `prepareChartData`
    - Terima `Transaction[]`, kelompokkan berdasarkan kategori, hitung total per kategori
    - Filter out kategori dengan total === 0
    - Kembalikan `{ labels: string[], data: number[], colors: string[] }` menggunakan `getColorForCategory`
    - _Requirements: 5.1, 5.3_
  - [x] 9.2 Tulis property test untuk chart data excludes zero-total categories (Property 9)
    - **Property 9: Chart data excludes zero-total categories**
    - Untuk sembarang array transaksi, setiap label di hasil `prepareChartData` harus memiliki total > 0 dan `data[i]` harus sama persis dengan sum amount kategori tersebut
    - **Validates: Requirements 5.1**
  - [x] 9.3 Implementasi `renderChart` dengan destroy/recreate lifecycle dan CDN fallback
    - Cek `typeof Chart === 'undefined'`; jika ya, panggil `showError` di `#chart-error` dan sembunyikan `#chart-section`, return
    - Jika ada `AppState.chartInstance`, panggil `.destroy()` sebelum membuat yang baru
    - Jika tidak ada transaksi, sembunyikan canvas, tampilkan `#chart-empty-message`, return
    - Buat Chart.js `'pie'` instance dengan `prepareChartData`, konfigurasi tooltip untuk menampilkan `formatRupiah` + persentase 1 desimal
    - Simpan instance ke `AppState.chartInstance`
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 7.5, 7.6_

- [x] 10. Event handlers dan init
  - [x] 10.1 Implementasi `handleFormSubmit` dan `handleDeleteTransaction`
    - `handleFormSubmit(event)`: `event.preventDefault()`, baca nilai form, panggil `clearErrors()`, panggil `validateTransaction`; jika tidak valid tampilkan error per field; jika valid panggil `createTransaction`, reset form (`itemName = ''`, `amount = ''`, `category = ''`)
    - `handleDeleteTransaction(id)`: panggil `deleteTransaction(id)` dari AppState
    - _Requirements: 1.2, 1.3, 1.5, 3.4_
  - [x] 10.2 Tulis property test untuk form reset after valid submission (Property 3)
    - **Property 3: Form reset after valid submission**
    - Setelah submit yang berhasil, field `itemName`, `amount` harus `""` dan `category` kembali ke opsi default
    - **Validates: Requirements 1.5**
  - [x] 10.3 Implementasi `init` dengan `DOMContentLoaded`
    - Panggil `loadTransactions()` di dalam `init()`; jika ada error tampilkan global error banner
    - Set `AppState.transactions` ke hasil load (atau `[]` jika error)
    - Attach event listener `submit` pada `#transaction-form` → `handleFormSubmit`
    - Attach delegated event listener `click` pada `#transaction-list` untuk tombol hapus → `handleDeleteTransaction`
    - Panggil `renderAll()` untuk render state awal
    - Daftarkan `window.addEventListener('load', ...)` untuk cek CDN Chart.js
    - `document.addEventListener('DOMContentLoaded', init)`
    - _Requirements: 2.3, 2.4, 2.5, 7.6_

- [x] 11. CSS polish
  - [x] 11.1 Tambahkan hover/tap states, transitions, dan styles UI pendukung
    - Tombol submit: hover dan active state menggunakan `--color-brown-dark`, transition `background-color 200ms ease`
    - Tombol hapus per item transaksi: hover terracotta, transition 200ms
    - Input focus: outline/border menggunakan `--color-brown-primary`
    - `.error-message`: warna merah/terracotta, ukuran font kecil, `display: none` default
    - `.error-banner`: background terracotta muda, border, padding, `display: none` default
    - `#list-empty-message`, `#chart-empty-message`: warna teks muted, teks rata tengah, italic
    - _Requirements: 1.3, 2.4, 3.5, 5.4, 6.4_

- [x] 12. Checkpoint akhir — pastikan semua tes lulus dan app berfungsi end-to-end
  - Pastikan semua tes lulus; tanyakan ke user jika ada pertanyaan.

---

### Fitur Nice-to-Have (Opsional)

- [x] 13. Custom categories
  - [x] 13.1 Implementasi `validateCategoryName` dan UI tambah kategori
    - Tambahkan input teks dan tombol "Tambah Kategori" di bawah dropdown kategori di form
    - Implementasi `validateCategoryName(name, existingCategories)`: `name.trim().length >= 1`, `<= 30`, tidak duplikat (case-insensitive)
    - Simpan kategori kustom ke `localStorage` (key terpisah `ebv_categories`)
    - Tambahkan `<option>` baru ke dropdown secara dinamis
    - Tampilkan `Error_Notification` jika nama kosong, > 30 karakter, atau duplikat
    - _Requirements: 10.1, 10.2_
  - [x] 13.2 Tulis property test untuk custom category name validation (Property 11)
    - **Property 11: Custom category name validation**
    - `validateCategoryName` harus `isValid: true` jika dan hanya jika trim length 1–30 dan tidak duplikat case-insensitive
    - **Validates: Requirements 10.1, 10.2**

- [x] 14. Monthly summary
  - [x] 14.1 Implementasi `groupByMonth` dan tampilan ringkasan bulanan
    - Implementasi `groupByMonth(transactions)`: kelompokkan berdasarkan key `"YYYY-MM"` dari `timestamp`, hitung sum per bulan
    - Render ringkasan di section baru di bawah `Transaction_List`
    - Format total dengan `formatRupiah`
    - _Requirements: 10.3_
  - [x] 14.2 Tulis property test untuk monthly grouping aggregation (Property 12)
    - **Property 12: Monthly grouping aggregation**
    - Untuk sembarang array transaksi, setiap key di hasil `groupByMonth` harus berformat `"YYYY-MM"` dan nilai-nya harus sama persis dengan sum amount transaksi di bulan tersebut
    - **Validates: Requirements 10.3**

- [x] 15. Sort transactions
  - [x] 15.1 Implementasi UI sort dan logika pengurutan
    - Tambahkan `<select>` sort di atas `Transaction_List` (opsi: default, Amount ↑, Amount ↓, Category A–Z)
    - Implementasi logika sort di `renderTransactionList` berdasarkan pilihan sort aktif
    - Sort harus tampil dalam < 1 detik
    - _Requirements: 10.4_
  - [x] 15.2 Tulis property test untuk sort order invariant (Property 13)
    - **Property 13: Sort order invariant**
    - Untuk sembarang array dengan ≥ 2 elemen, sort amount ascending harus menghasilkan `a[i].amount <= a[i+1].amount`; sort category A–Z harus menghasilkan `localeCompare <= 0`
    - **Validates: Requirements 10.4**

- [x] 16. Spending limit
  - [x] 16.1 Implementasi `validateSpendingLimit`, UI batas pengeluaran, dan highlight visual
    - Tambahkan form kecil untuk menetapkan spending limit per kategori (nilai Rp 1 – Rp 999.999.999)
    - Implementasi `validateSpendingLimit(value)`: valid jika number, > 0, <= 999999999
    - Simpan batas ke `localStorage` (key `ebv_limits`)
    - Tambahkan logika di `renderTransactionList` atau `renderChart` untuk highlight kategori yang melebihi batas
    - Tampilkan `Error_Notification` untuk input batas yang tidak valid
    - _Requirements: 10.5, 10.6_
  - [x] 16.2 Tulis property test untuk spending limit threshold detection (Property 14)
    - **Property 14: Spending limit threshold detection**
    - Untuk sembarang pasangan positif (categoryTotal, limit), `isOverLimit(categoryTotal, limit)` harus `true` jika dan hanya jika `categoryTotal > limit`
    - **Validates: Requirements 10.5**

- [x] 17. Dark/light mode
  - [x] 17.1 Implementasi toggle tema dan persistensi preferensi
    - Tambahkan tombol toggle tema (ikon matahari/bulan) di header
    - Implementasi `saveThemePreference(mode)` dan `loadThemePreference()`; mode disimpan di `localStorage` key `ebv_theme`
    - Terapkan tema dengan menambah/hapus class `.dark-mode` pada `<body>` atau `<html>`
    - Definisikan CSS variables override untuk dark mode: palet earth tone gelap dengan kontras minimum WCAG 4.5:1
    - Transisi tema dalam < 500ms menggunakan CSS `transition`
    - _Requirements: 10.7_
  - [x] 17.2 Tulis property test untuk dark/light mode preference persistence (Property 15)
    - **Property 15: Dark/light mode preference persistence**
    - Untuk sembarang nilai `"light"` atau `"dark"`, `saveThemePreference` lalu `loadThemePreference` harus mengembalikan nilai yang sama
    - **Validates: Requirements 10.7**

---

## Notes

- Task dengan tanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk traceability
- Checkpoint memastikan validasi inkremental sebelum melanjutkan
- Property tests memvalidasi properti kebenaran universal menggunakan fast-check
- Unit tests memvalidasi skenario spesifik dan edge case
- Semua modul JavaScript ditulis dalam satu file `js/script.js` menggunakan Module Pattern
- Aplikasi harus bisa dibuka langsung dengan membuka `index.html` di browser tanpa build step

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.2", "6.2", "6.3"] },
    { "id": 5, "tasks": ["7.1", "7.3", "7.5", "7.7"] },
    { "id": 6, "tasks": ["7.2", "7.4", "7.6", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3"] },
    { "id": 8, "tasks": ["10.1", "10.3"] },
    { "id": 9, "tasks": ["10.2", "11.1"] },
    { "id": 10, "tasks": ["13.1", "14.1", "15.1", "16.1", "17.1"] },
    { "id": 11, "tasks": ["13.2", "14.2", "15.2", "16.2", "17.2"] }
  ]
}
```
