# Portofolio Muhammad Irhamni

## Menjalankan backend lokal

Backend memakai Node.js 18 atau lebih baru dan MySQL/MariaDB. Buat database sekali di MySQL:

```sql
CREATE DATABASE portfolio_irhamni
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Di PowerShell:

```powershell
$env:PORTFOLIO_ADMIN_PASSWORD='kata-sandi-pilihanmu-minimal-12-karakter'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_USER='root'
$env:DB_PASSWORD='kata-sandi-mysql'
$env:DB_NAME='portfolio_irhamni'
npm.cmd start
```

Server membuat tabel `assignments` secara otomatis. Saat dijalankan, server juga menambahkan kolom Academic Hub yang belum tersedia ke tabel yang sudah ada tanpa menghapus baris tugas sebelumnya. Semester, mata kuliah, kategori, judul, deskripsi, tenggat, status, dan tautan disimpan di MySQL. Lampiran file disimpan di `data/assignments/` (PDF, Word, PowerPoint, Excel, atau ZIP, maksimal 10 MB). Database dan folder `data/` perlu dicadangkan serta dibuat persisten saat aplikasi di-hosting.

Tugas lama tetap tersedia dan menggunakan kategori `Tugas`, status `Dalam proses`, serta tanpa tenggat jika informasi itu sebelumnya belum ada.

Buka `http://127.0.0.1:3000`. Data proyek disimpan di `data/projects.json` dan tetap ada setelah server dimulai ulang. Folder `data/` tidak disertakan dalam Git. Data proyek lama yang hanya tersimpan di `localStorage` browser tidak otomatis dipindahkan.

Di bagian **Academic Hub**, admin yang sudah masuk dapat menambah, mengubah, dan menghapus tugas Semester 5 Tahun Akademik 2026/2027. Tugas dapat memiliki tenggat, kategori, status, serta file atau tautan. Pencarian dan filter mata kuliah menggunakan data dari database. Pengunjung dapat melihat tugas dan membuka lampiran. Masuk melalui bagian **Kelola proyek**; sesi admin berlaku untuk pengelolaan proyek dan tugas.

Daftar mata kuliah Semester 5 ditampilkan di antarmuka. Tugas tetap disimpan di MySQL; daftar mata kuliah ini tidak memerlukan perubahan skema database.

Detail proyek dapat menyimpan tujuan dan tautan dokumentasi secara opsional. Jika belum diisi, keduanya tidak ditampilkan dan tidak dibuatkan data pengganti.

Pilih **Masuk admin** pada bagian **Kelola proyek** untuk menambah, mengubah, atau menghapus proyek dan arsip tugas. Tanpa login, pengunjung hanya dapat melihat proyek serta arsip tugas.

Untuk produksi, atur `PORTFOLIO_ADMIN_PASSWORD` sebagai environment variable rahasia di layanan hosting. Gunakan HTTPS; cookie sesi diberi atribut `Secure` ketika `NODE_ENV=production`. Proses server perlu tetap berjalan dan penyimpanan `data/` harus persisten.

Jika layanan hosting memerlukan server menerima koneksi dari luar container, atur `HOST=0.0.0.0` dan `PORT` sesuai konfigurasi layanan tersebut.
