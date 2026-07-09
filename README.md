# Expense & Budget Visualizer

Expense & Budget Visualizer adalah aplikasi web statis satu halaman untuk mencatat pengeluaran harian secara personal. Pengguna dapat memasukkan transaksi beserta kategori, memantau total saldo yang diperbarui secara otomatis, menghapus transaksi, dan memvisualisasikan distribusi pengeluaran per kategori melalui pie chart interaktif. Aplikasi berjalan sepenuhnya di browser — tidak memerlukan backend, server, atau build step. Data tersimpan secara persisten di Local Storage. Tampilan menggunakan palet warna earth tone yang hangat, dengan desain mobile-first.

---

## Cara Menjalankan

1. Clone atau download repository ini ke komputer Anda.
2. Buka folder hasil clone/download.
3. Klik dua kali pada file `index.html` untuk membukanya langsung di browser (Chrome, Firefox, Edge, atau Safari versi terkini).
4. Aplikasi siap digunakan — tidak perlu instalasi, server lokal, atau konfigurasi tambahan.

---

## Fitur Utama

- **Pencatatan Transaksi** — Tambahkan pengeluaran dengan nama item, jumlah (Rupiah), dan kategori (Food, Transport, Fun) melalui formulir yang dilengkapi validasi input.
- **Total Balance Real-Time** — Header selalu menampilkan total kumulatif pengeluaran dalam format Rupiah (contoh: Rp 1.250.000), diperbarui otomatis setiap kali transaksi ditambahkan atau dihapus.
- **Visualisasi Pie Chart** — Distribusi pengeluaran per kategori ditampilkan sebagai pie chart interaktif menggunakan Chart.js, dengan warna earth tone yang konsisten per kategori.
- **Riwayat Transaksi** — Daftar lengkap semua transaksi yang tersimpan dengan opsi hapus per item; dapat di-scroll untuk daftar yang panjang.
- **Persistensi Data** — Seluruh data transaksi disimpan di Local Storage sehingga tetap ada meskipun browser ditutup dan dibuka kembali.

---

## Struktur File

```
index.html        ← Entry point aplikasi
css/
  style.css       ← Seluruh styling (earth tone, mobile-first, responsive)
js/
  script.js       ← Seluruh logika aplikasi (Storage, Validator, Formatter, Chart, App)
.gitignore
README.md
```

---

## Teknologi

- HTML5, CSS3, Vanilla JavaScript (ES6+)
- [Chart.js](https://www.chartjs.org/) via CDN untuk pie chart
- Web Storage API (localStorage) untuk persistensi data
- Google Fonts (Poppins, Nunito) untuk tipografi
