# Panduan Migrasi & Deployment SIBN ke InfinityFree (MySQL & PHP)

Sistem Informasi Blanko Nikah (SIBN) Kabupaten Tangerang telah disempurnakan agar mendukung penuh database **MySQL** dan dapat di-host secara gratis di **InfinityFree.com** (atau hosting cPanel apa pun) menggunakan kombinasi **React (Vite) Frontend** dan **PHP API Engine**.

---

## 🛠️ Persiapan Database & File

Kami telah menyediakan file penunjang yang siap digunakan:
1. `/.htaccess` : File konfigurasi Apache untuk routing otomatis dari `/api/*` ke `api.php` dan mendukung routing SPA React.
2. `/api.php` : Mesin backend API tunggal yang aman berbasis PHP & PDO MySQL (menggantikan `server.ts`).
3. `/database_mysql.sql` : Schema database lengkap beserta data seed awal (29 KUA Kabupaten Tangerang & akun operasional).

---

## 🚀 Langkah Demi Langkah Deployment

### Langkah 1: Build Frontend React ke File Statis
Lakukan build pada aplikasi React agar dikompilasi menjadi file statis HTML, CSS, dan JS:
```bash
npm run build
```
Setelah build selesai, folder baru bernama `dist/` akan terbentuk di direktori root proyek Anda. File di dalam folder `dist/` inilah yang akan diunggah ke web server.

### Langkah 2: Buat Database MySQL di InfinityFree
1. Masuk ke **Client Area InfinityFree** Anda, lalu buka **Control Panel (vPanel)**.
2. Cari menu **MySQL Databases** di bagian *Databases*.
3. Buat database baru, contoh: `epiz_xxx_sibn_db`.
4. Catat detail koneksi database Anda yang tampil di halaman tersebut:
   - **MySQL Host** (Contoh: `sql300.epizy.com`)
   - **MySQL Username** (Contoh: `epiz_xxxxxxxx`)
   - **MySQL Password** (Password akun InfinityFree Anda)
   - **MySQL Port** (`3306`)
   - **Database Name** (Contoh: `epiz_xxx_sibn_db`)

### Langkah 3: Impor Schema Database via phpMyAdmin
1. Di Control Panel InfinityFree, buka **phpMyAdmin**.
2. Pilih nama database yang baru saja Anda buat.
3. Klik tab **Import** di bagian atas phpMyAdmin.
4. Klik **Choose File** dan pilih file `database_mysql.sql` dari komputer Anda.
5. Klik **Go** atau **Kirim** di bagian bawah untuk mengeksekusi impor data. Database SIBN Anda kini sudah terisi 29 KUA dan akun operasional!

### Langkah 4: Konfigurasi Database di `api.php`
Buka file `api.php` Anda dan perbarui baris konfigurasi database di bagian atas (sekitar baris 33-37) dengan kredensial InfinityFree Anda:
```php
$db_host = 'sql300.epizy.com'; // Sesuaikan dengan MySQL Host Anda
$db_port = '3306';
$db_name = 'epiz_xxx_sibn_db'; // Sesuaikan dengan Database Name Anda
$db_user = 'epiz_xxxxxxxx';    // Sesuaikan dengan MySQL Username Anda
$db_pass = 'password_anda';    // Sesuaikan dengan Password Anda
```
*Catatan: Anda juga bisa menyetelnya menggunakan environment variables di server jika didukung oleh hosting.*

### Langkah 5: Unggah File ke Folder `htdocs` InfinityFree
Hubungkan ke server InfinityFree menggunakan klien FTP (seperti **FileZilla**) atau melalui **Online File Manager** di Control Panel:
1. Masuk ke folder **`htdocs/`** (Folder publik utama di InfinityFree).
2. Unggah seluruh isi di dalam folder **`dist/`** Anda (bukan folder `dist`-nya, melainkan file di dalamnya seperti `index.html`, folder `assets/`, dll.) langsung ke dalam folder `htdocs/`.
3. Unggah file-file berikut langsung ke folder `htdocs/`:
   - **`.htaccess`**
   - **`api.php`**
4. Buat folder kosong baru bernama **`uploads`** di dalam `htdocs/` untuk menyimpan dokumen PDF laporan fisik yang diunggah oleh operator KUA.

Selesai! Sekarang aplikasi SIBN Anda sudah aktif 100% menggunakan PHP & MySQL di InfinityFree.

---

## 🔐 Informasi Akun Default (Siap Pakai)

Semua password akun di database MySQL telah dienkripsi menggunakan metode enkripsi standard PHP `password_hash()` (Bcrypt) yang sangat aman dan dapat langsung digunakan:

1. **Akun Administrator**
   - **Username**: `admin`
   - **Password**: `admin123`
   - **Fungsi**: Memiliki kendali penuh terhadap master data KUA, manajemen akun pengguna, monitoring log aktivitas, serta Backup & Restore database.

2. **Akun Kemenag (Viewer)**
   - **Username**: `viewer`
   - **Password**: `viewer123`
   - **Fungsi**: Memonitor dashboard rekapitulasi, grafik tren stok bulanan, rincian ketersediaan, serta melihat & mengunduh berkas laporan fisik PDF dari seluruh KUA.

3. **Akun Operator KUA**
   - **Username**: Nama KUA masing-masing dengan huruf kecil tanpa spasi (contoh: `rajeg`, `mauk`, `curug`, `teluknaga`, `sepatan`, dll.)
   - **Password**: `12345` (Semua operator default menggunakan password ini)
   - **Fungsi**: Menginput data mutasi blanko nikah, mengedit laporan KUA-nya, mengunggah berkas tanda tangan laporan PDF fisik, serta melihat riwayat data KUA-nya sendiri.
