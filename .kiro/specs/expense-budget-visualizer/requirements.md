# Requirements Document

## Introduction

Expense & Budget Visualizer adalah mini web app statis untuk mencatat pengeluaran harian secara personal. Pengguna dapat memasukkan transaksi pengeluaran beserta kategori, melihat total saldo yang otomatis diperbarui, menghapus transaksi, dan memvisualisasikan distribusi pengeluaran per kategori dalam bentuk pie chart. Aplikasi berjalan sepenuhnya di browser (tanpa backend) menggunakan HTML, CSS, dan vanilla JavaScript, dengan data tersimpan di Local Storage. Desain menggunakan palet earth tone yang hangat dan cozy, berbasis mobile-first.

---

## Glossary

- **App**: Aplikasi Expense & Budget Visualizer secara keseluruhan.
- **Input_Form**: Komponen formulir untuk menambahkan transaksi baru (Item Name, Amount, Category).
- **Transaction**: Satu entri pengeluaran yang terdiri dari nama item, jumlah, dan kategori.
- **Transaction_List**: Komponen antarmuka yang menampilkan daftar seluruh transaksi yang tersimpan.
- **Balance_Display**: Komponen header yang menampilkan total pengeluaran terkini.
- **Chart**: Komponen pie chart yang memvisualisasikan distribusi pengeluaran per kategori.
- **Local_Storage**: Web API browser untuk menyimpan data secara persisten di sisi klien.
- **Category**: Klasifikasi jenis pengeluaran; nilai yang valid adalah Food, Transport, dan Fun.
- **Validator**: Modul yang memeriksa kelengkapan dan kebenaran input formulir.
- **Error_Notification**: Pesan validasi kecil yang ditampilkan di dalam antarmuka (bukan browser alert).
- **Chart_Library**: Library Chart.js yang dimuat melalui CDN untuk merender pie chart.
- **Storage_Manager**: Modul yang mengelola operasi baca/tulis ke Local_Storage.

---

## Requirements

### Requirement 1: Input Transaksi

**User Story:** Sebagai pengguna, saya ingin mengisi formulir pengeluaran dengan nama item, jumlah, dan kategori, sehingga saya dapat mencatat setiap transaksi dengan cepat.

#### Acceptance Criteria

1. THE Input_Form SHALL menyediakan field teks untuk nama item (maksimal 100 karakter), field angka untuk jumlah (antara 0.01 hingga 999.999.999,99), dan dropdown untuk kategori (Food, Transport, Fun).
2. WHEN pengguna menekan tombol submit pada Input_Form, THE Validator SHALL memeriksa bahwa: nama item tidak kosong, jumlah lebih besar dari 0, dan kategori telah dipilih (bukan opsi default/placeholder).
3. IF nama item kosong, jumlah bernilai nol atau negatif, atau kategori belum dipilih saat submit, THEN THE Error_Notification SHALL ditampilkan di dalam antarmuka mengidentifikasi field mana yang tidak valid, tanpa menggunakan browser alert.
4. WHEN semua field valid dan tombol submit ditekan, THE App SHALL membuat objek Transaction baru dengan nama, jumlah, kategori, dan timestamp dalam format ISO 8601.
5. WHEN sebuah Transaction berhasil dibuat, THE Input_Form SHALL mereset nama item ke string kosong, jumlah ke kosong, dan kategori ke opsi pertama/default.

---

### Requirement 2: Penyimpanan Data di Local Storage

**User Story:** Sebagai pengguna, saya ingin data transaksi saya tersimpan secara lokal, sehingga data tetap ada meskipun browser ditutup dan dibuka kembali.

#### Acceptance Criteria

1. WHEN sebuah Transaction baru berhasil dibuat, THE Storage_Manager SHALL menyimpan Transaction ke Local_Storage dalam format JSON array.
2. WHEN pengguna menghapus sebuah Transaction, THE Storage_Manager SHALL menghapus entri Transaction tersebut dari Local_Storage dan array yang tersimpan diperbarui.
3. WHEN App dimuat di browser, THE Storage_Manager SHALL membaca seluruh data Transaction yang tersimpan di Local_Storage dalam waktu kurang dari 3 detik dan memuat ulang state aplikasi.
4. IF data JSON di Local_Storage tidak dapat di-parse atau corrupt, THEN THE App SHALL mengosongkan state transaksi ke array kosong dan menampilkan Error_Notification yang menginformasikan bahwa data sebelumnya tidak dapat dibaca.
5. IF Local_Storage tidak tersedia atau terjadi error saat operasi baca/tulis, THEN THE App SHALL menampilkan Error_Notification yang menginformasikan bahwa penyimpanan tidak tersedia, sambil mempertahankan data Transaction yang sudah dimuat di app state.

---

### Requirement 3: Daftar Transaksi

**User Story:** Sebagai pengguna, saya ingin melihat daftar semua transaksi yang telah saya catat, sehingga saya dapat memantau riwayat pengeluaran saya.

#### Acceptance Criteria

1. THE Transaction_List SHALL menampilkan seluruh Transaction yang tersimpan, dengan setiap item menampilkan nama item, jumlah dalam format mata uang Rupiah (contoh: Rp 1.250.000), dan kategori.
2. WHEN sebuah Transaction baru berhasil ditambahkan, THE Transaction_List SHALL memperbarui tampilannya dalam waktu kurang dari 500ms tanpa reload halaman.
3. THE Transaction_List SHALL memiliki kontainer dengan scroll vertikal dan max-height 400px, sehingga dapat di-scroll ketika jumlah item melebihi tinggi tersebut.
4. WHEN pengguna menekan tombol hapus pada sebuah Transaction, THE App SHALL menghapus Transaction tersebut dari Transaction_List dan dari Local_Storage secara bersamaan, sehingga item tidak muncul kembali setelah reload halaman.
5. IF tidak ada Transaction yang tersimpan, THEN THE Transaction_List SHALL menampilkan pesan placeholder yang menginformasikan bahwa belum ada transaksi.
6. IF Local_Storage tidak dapat diakses saat memuat Transaction_List, THEN THE App SHALL menampilkan Error_Notification dan Transaction_List SHALL menampilkan state kosong.

---

### Requirement 4: Tampilan Total Balance

**User Story:** Sebagai pengguna, saya ingin melihat total pengeluaran saya di bagian atas halaman secara mencolok, sehingga saya selalu mengetahui total yang telah dikeluarkan.

#### Acceptance Criteria

1. THE Balance_Display SHALL menampilkan total kumulatif dari seluruh jumlah Transaction yang tersimpan.
2. WHEN sebuah Transaction baru ditambahkan, THE Balance_Display SHALL memperbarui total secara otomatis dalam waktu kurang dari 500ms tanpa reload halaman.
3. WHEN sebuah Transaction dihapus, THE Balance_Display SHALL mengurangi total secara otomatis dalam waktu kurang dari 500ms tanpa reload halaman.
4. THE Balance_Display SHALL memformat angka total dengan separator titik ribuan, prefix "Rp ", dan tanpa desimal (contoh: Rp 1.250.000).
5. WHEN tidak ada Transaction, THE Balance_Display SHALL menampilkan nilai "Rp 0".
6. THE Balance_Display SHALL ditempatkan di bagian paling atas halaman dengan ukuran font minimum 24px untuk angka total balance.

---

### Requirement 5: Visualisasi Pie Chart

**User Story:** Sebagai pengguna, saya ingin melihat distribusi pengeluaran per kategori dalam bentuk pie chart, sehingga saya dapat memahami pola pengeluaran saya secara visual.

#### Acceptance Criteria

1. THE Chart SHALL merender pie chart menggunakan Chart_Library (Chart.js via CDN) yang menampilkan proporsi pengeluaran untuk setiap Category yang memiliki total pengeluaran lebih dari 0.
2. WHEN sebuah Transaction baru ditambahkan atau dihapus, THE Chart SHALL memperbarui data dan tampilan secara otomatis dalam waktu kurang dari 500ms tanpa reload halaman.
3. THE Chart SHALL menggunakan warna earth tone untuk setiap segmen kategori: Food (#A47148), Transport (#8A9A5B), Fun (#C97C5D). Untuk kategori di luar tiga yang terdefinisi, THE Chart SHALL menggunakan warna fallback (#B5654A) agar rendering tidak terganggu.
4. WHEN semua Transaction dihapus sehingga tidak ada data, THE Chart SHALL menyembunyikan canvas dan menampilkan pesan teks yang menginformasikan bahwa belum ada data untuk ditampilkan.
5. THE Chart SHALL menampilkan label kategori dan persentase dengan satu angka desimal (contoh: 45.2%) pada setiap segmen pie chart yang memiliki nilai lebih dari 0.

---

### Requirement 6: Layout dan Struktur Halaman

**User Story:** Sebagai pengguna, saya ingin antarmuka yang terstruktur dan mudah dinavigasi, sehingga saya dapat menggunakan aplikasi dengan nyaman di perangkat mobile maupun desktop.

#### Acceptance Criteria

1. THE App SHALL menyusun tampilan dengan urutan vertikal: Balance_Display (header) → Input_Form → Chart → Transaction_List, dengan setiap komponen menempati lebar penuh kontainer induknya.
2. WHEN App dimuat pada viewport dengan lebar kurang dari 768px, THE App SHALL menampilkan layout single-column dengan semua komponen tersusun vertikal.
3. WHEN App dimuat pada viewport dengan lebar minimum 768px, THE App SHALL menampilkan layout multi-column dengan Input_Form dan Chart berdampingan secara horizontal.
4. THE App SHALL menggunakan palet warna earth tone: background krem/beige (#F5F0E8, #EFE6D8), aksen cokelat (#A47148, #6F4E37), sage (#8A9A5B, #6B7A5E), dan terracotta (#C97C5D, #B5654A) pada semua komponen utama, tanpa menggunakan warna di luar palet ini.
5. THE App SHALL menampilkan komponen dalam card dengan border-radius 12–16px dan box-shadow dengan blur radius maksimal 16px dan spread 0px.
6. WHEN App dimuat di browser, THE App SHALL memuat font dari Google Fonts (Poppins, Nunito, Inter, atau Quicksand) dan menerapkannya pada seluruh teks komponen utama. IF pemuatan font gagal, THE App SHALL menggunakan fallback font sans-serif sistem tanpa error message ke pengguna.

---

### Requirement 7: Struktur File dan Kompatibilitas Browser

**User Story:** Sebagai developer, saya ingin aplikasi menggunakan struktur file yang bersih dan berjalan di semua browser modern, sehingga mudah di-deploy dan diakses tanpa konfigurasi tambahan.

#### Acceptance Criteria

1. THE App SHALL distrukturkan dalam folder dengan file `index.html` di root, CSS di `css/style.css`, dan JavaScript di `js/script.js`.
2. THE App SHALL berjalan langsung dengan membuka `index.html` di browser tanpa memerlukan build step atau server lokal.
3. THE App SHALL berfungsi secara konsisten di Chrome, Firefox, Edge, dan Safari pada versi major terkini yang dirilis dalam 2 tahun terakhir.
4. THE App SHALL tidak memerlukan framework JavaScript (React, Vue, Angular, dsb.); hanya menggunakan HTML, CSS, dan vanilla JavaScript.
5. THE App SHALL memuat Chart_Library (Chart.js) melalui CDN tanpa instalasi lokal.
6. IF Chart_Library gagal dimuat dari CDN, THEN THE App SHALL menampilkan Error_Notification yang menginformasikan bahwa visualisasi tidak tersedia, sementara fungsionalitas input dan daftar transaksi tetap dapat digunakan.

---

### Requirement 8: Performa dan Simplisitas

**User Story:** Sebagai pengguna, saya ingin aplikasi memuat dengan cepat dan responsif saat digunakan, sehingga pengalaman mencatat transaksi tidak terganggu.

#### Acceptance Criteria

1. THE App SHALL merender tampilan awal (initial render) dalam waktu kurang dari 3 detik pada koneksi broadband dengan kecepatan unduh minimum 10 Mbps.
2. WHEN pengguna berinteraksi dengan Input_Form, Transaction_List, atau Chart, THE App SHALL merespons dalam waktu kurang dari 200ms, diukur dari waktu input pengguna hingga pembaruan visual pertama tampil di layar.
3. THE App SHALL tidak memerlukan proses setup, registrasi, atau login dari pengguna.
4. WHEN Transaction_List memuat lebih dari 500 entri, THE App SHALL tetap merespons interaksi pengguna dalam waktu kurang dari 200ms.

---

### Requirement 9: README dan .gitignore

**User Story:** Sebagai developer, saya ingin tersedia dokumentasi singkat dan file .gitignore, sehingga repository siap di-publish ke GitHub Pages.

#### Acceptance Criteria

1. THE App SHALL menyertakan file `README.md` di root directory yang memuat minimum satu paragraf deskripsi aplikasi, langkah-langkah eksplisit cara menjalankan, dan daftar minimum 3 fitur utama.
2. THE App SHALL menyertakan file `.gitignore` di root directory yang mengecualikan file sistem operasi umum (`.DS_Store`, `Thumbs.db`) dan file editor (`.vscode/`, `.idea/`).
3. THE `README.md` SHALL di-render dengan benar sebagai markdown di GitHub Pages tanpa error tampilan.

---

### Requirement 10: Fitur Tambahan (Nice to Have)

**User Story:** Sebagai pengguna tingkat lanjut, saya ingin fitur-fitur opsional yang memperkaya pengalaman pengelolaan pengeluaran, sehingga aplikasi dapat tumbuh sesuai kebutuhan saya.

#### Acceptance Criteria

1. WHERE fitur Custom_Category diaktifkan, THE Input_Form SHALL mengizinkan pengguna menambahkan kategori baru dengan nama 1–30 karakter di luar Food, Transport, dan Fun.
2. WHERE fitur Custom_Category diaktifkan, IF pengguna mencoba menambahkan kategori dengan nama kosong, lebih dari 30 karakter, atau duplikat (case-insensitive), THEN THE App SHALL menampilkan Error_Notification yang mengidentifikasi alasan penolakan.
3. WHERE fitur Monthly_Summary diaktifkan, THE App SHALL menampilkan ringkasan total pengeluaran per bulan berdasarkan timestamp Transaction, dikelompokkan berdasarkan kombinasi bulan dan tahun, dalam format mata uang Rupiah yang konsisten.
4. WHERE fitur Sort_Transactions diaktifkan, THE Transaction_List SHALL memungkinkan pengguna mengurutkan transaksi berdasarkan jumlah (ascending/descending) atau kategori (A–Z), dengan hasil sort tampil dalam waktu kurang dari 1 detik.
5. WHERE fitur Spending_Limit diaktifkan, THE App SHALL mengizinkan pengguna menetapkan batas pengeluaran per kategori antara Rp 1 hingga Rp 999.999.999. WHEN total pengeluaran suatu kategori melebihi batas tersebut, THE App SHALL menampilkan highlight visual pada kategori tersebut yang tetap terlihat hingga total turun di bawah batas.
6. WHERE fitur Spending_Limit diaktifkan, IF pengguna memasukkan nilai batas yang tidak valid (nol, negatif, atau di luar rentang), THEN THE App SHALL menampilkan Error_Notification tanpa menyimpan nilai tersebut.
7. WHERE fitur Dark_Light_Mode diaktifkan, THE App SHALL menampilkan toggle untuk beralih antara mode terang dan gelap dalam waktu kurang dari 500ms, mempertahankan rasio kontras minimum WCAG 4.5:1, menggunakan palet earth tone pada kedua mode, dan menyimpan preferensi mode ke Local_Storage agar persisten lintas sesi.
