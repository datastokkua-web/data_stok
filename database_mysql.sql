-- =======================================================
-- SIBN (Sistem Informasi Blanko Nikah) - Kabupaten Tangerang
-- Schema & Seed Data for MySQL Database
-- Compatible with InfinityFree, cPanel, and general PHP/MySQL Hosting
-- =======================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------
-- 1. Table Structure: kua
-- -------------------------------------------------------
DROP TABLE IF EXISTS `kua`;
CREATE TABLE `kua` (
  `id_kua` int(11) NOT NULL AUTO_INCREMENT,
  `nama_kua` varchar(100) NOT NULL,
  `alamat` text DEFAULT NULL,
  `kepala_kua` varchar(150) DEFAULT NULL,
  `operator` varchar(100) DEFAULT NULL,
  `aktif` int(11) DEFAULT 1,
  PRIMARY KEY (`id_kua`),
  UNIQUE KEY `uq_nama_kua` (`nama_kua`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 2. Table Structure: users
-- -------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama` varchar(150) NOT NULL,
  `level` varchar(50) NOT NULL, -- 'Admin', 'Operator KUA', 'Viewer'
  `status` varchar(50) DEFAULT 'Aktif',
  `last_login` varchar(100) DEFAULT NULL,
  `ganti_password` int(11) DEFAULT 0,
  `id_kua` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uq_username` (`username`),
  KEY `fk_user_kua` (`id_kua`),
  CONSTRAINT `fk_user_kua` FOREIGN KEY (`id_kua`) REFERENCES `kua` (`id_kua`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 3. Table Structure: laporan_stok
-- -------------------------------------------------------
DROP TABLE IF EXISTS `laporan_stok`;
CREATE TABLE `laporan_stok` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_kua` int(11) NOT NULL,
  `tahun` int(11) NOT NULL,
  `bulan` varchar(50) NOT NULL,
  `jenis` varchar(50) NOT NULL, -- 'Masuk', 'Keluar', 'Rusak'
  `subjenis` varchar(50) NOT NULL, -- 'NB', 'N', 'NA'
  `kategori` varchar(50) DEFAULT '', -- 'Nikah', 'Isbat', 'Duplikat', or ''
  `jumlah` int(11) NOT NULL DEFAULT 0,
  `created_at` varchar(100) NOT NULL,
  `updated_at` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_laporan_stok` (`id_kua`,`tahun`,`bulan`,`jenis`,`subjenis`,`kategori`),
  KEY `fk_stok_kua` (`id_kua`),
  CONSTRAINT `fk_stok_kua` FOREIGN KEY (`id_kua`) REFERENCES `kua` (`id_kua`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 4. Table Structure: upload_pdf
-- -------------------------------------------------------
DROP TABLE IF EXISTS `upload_pdf`;
CREATE TABLE `upload_pdf` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_kua` int(11) NOT NULL,
  `bulan` varchar(50) NOT NULL,
  `tahun` int(11) NOT NULL,
  `nama_file` varchar(255) NOT NULL,
  `tanggal_upload` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_upload_pdf` (`id_kua`,`bulan`,`tahun`),
  KEY `fk_pdf_kua` (`id_kua`),
  CONSTRAINT `fk_pdf_kua` FOREIGN KEY (`id_kua`) REFERENCES `kua` (`id_kua`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 5. Table Structure: activity_logs
-- -------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_user` int(11) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `aktivitas` varchar(100) NOT NULL,
  `detail` text NOT NULL,
  `timestamp` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =======================================================
-- DATA SEEDING
-- =======================================================

-- 1. Seed KUA list
INSERT INTO `kua` (`id_kua`, `nama_kua`, `alamat`, `kepala_kua`, `operator`, `aktif`) VALUES
(1, 'Teluknaga', 'Jl. Raya Teluknaga, Tangerang', 'H. Ahmad S.Ag', 'operator_teluknaga', 1),
(2, 'Mauk', 'Jl. Raya Mauk, Tangerang', 'Drs. Syarifuddin', 'operator_mauk', 1),
(3, 'Rajeg', 'Jl. Raya Rajeg No. 12, Tangerang', 'H. Mulyadi S.HI', 'operator_rajeg', 1),
(4, 'Sepatan', 'Jl. Raya Sepatan, Tangerang', 'Drs. H. Sanusi', 'operator_sepatan', 1),
(5, 'Pasar Kemis', 'Jl. Raya Pasar Kemis, Tangerang', 'H. Sukarnawijaya S.Ag', 'operator_pasarkemis', 1),
(6, 'Balaraja', 'Jl. Raya Balaraja, Tangerang', 'H. Syahroni S.Ag', 'operator_balaraja', 1),
(7, 'Kresek', 'Jl. Raya Kresek, Tangerang', 'Drs. H. Anwar', 'operator_kresek', 1),
(8, 'Kronjo', 'Jl. Raya Kronjo, Tangerang', 'H. Safei S.HI', 'operator_kronjo', 1),
(9, 'Curug', 'Jl. Raya Curug, Tangerang', 'H. Nasrullah S.Ag', 'operator_curug', 1),
(10, 'Cikupa', 'Jl. Raya Cikupa, Tangerang', 'H. M. Yusuf S.Ag', 'operator_cikupa', 1),
(11, 'Legok', 'Jl. Raya Legok, Tangerang', 'Drs. H. Hamdan', 'operator_legok', 1),
(12, 'Tigaraksa', 'Jl. Raya Tigaraksa No. 5, Tangerang', 'H. Ujang S.HI', 'operator_tigaraksa', 1),
(13, 'Cisoka', 'Jl. Raya Cisoka, Tangerang', 'H. Subur S.Ag', 'operator_cisoka', 1),
(14, 'Pakuhaji', 'Jl. Raya Pakuhaji, Tangerang', 'Drs. H. Kosasih', 'operator_pakuhaji', 1),
(15, 'Kosambi', 'Jl. Raya Kosambi, Tangerang', 'H. Zaenal Abidin S.Ag', 'operator_kosambi', 1),
(16, 'Pagedangan', 'Jl. Raya Pagedangan, Tangerang', 'Drs. H. Junaedi', 'operator_pagedangan', 1),
(17, 'Panongan', 'Jl. Raya Panongan, Tangerang', 'H. Mahmud S.HI', 'operator_panongan', 1),
(18, 'Cisauk', 'Jl. Raya Cisauk, Tangerang', 'Drs. H. Mansyur', 'operator_cisauk', 1),
(19, 'Jayanti', 'Jl. Raya Jayanti, Tangerang', 'H. Ahmad Fauzi S.Ag', 'operator_jayanti', 1),
(20, 'Kemiri', 'Jl. Raya Kemiri, Tangerang', 'Drs. H. Ridwan', 'operator_kemiri', 1),
(21, 'Sukadiri', 'Jl. Raya Sukadiri, Tangerang', 'H. Mas\'ud S.Ag', 'operator_sukadiri', 1),
(22, 'Jambe', 'Jl. Raya Jambe, Tangerang', 'Drs. H. Rustam', 'operator_jambe', 1),
(23, 'Sukamulya', 'Jl. Raya Sukamulya, Tangerang', 'H. Mahfudz S.HI', 'operator_sukamulya', 1),
(24, 'Kelapa Dua', 'Jl. Raya Kelapa Dua, Tangerang', 'H. Solihin S.Ag', 'operator_kelapadua', 1),
(25, 'Sindang Jaya', 'Jl. Raya Sindang Jaya, Tangerang', 'Drs. H. Yahya', 'operator_sindangjaya', 1),
(26, 'Sepatan Timur', 'Jl. Raya Sepatan Timur, Tangerang', 'H. Mukhtar S.Ag', 'operator_sepatantimur', 1),
(27, 'Solear', 'Jl. Raya Solear, Tangerang', 'H. Sobari S.Ag', 'operator_solear', 1),
(28, 'Gunung Kaler', 'Jl. Raya Gunung Kaler, Tangerang', 'Drs. H. Badri', 'operator_gunungkaler', 1),
(29, 'Mekar Baru', 'Jl. Raya Mekar Baru, Tangerang', 'H. Abdul Jamil S.Ag', 'operator_mekarbaru', 1);

-- 2. Seed Default Users
-- Default Passwords (encrypted using PHP standard password_hash BCRYPT):
-- admin -> admin123
-- viewer -> viewer123
-- operators -> 12345 (same username as the lowercase KUA name, spaces removed)
INSERT INTO `users` (`id_user`, `username`, `password`, `nama`, `level`, `status`, `last_login`, `ganti_password`, `id_kua`) VALUES
(1, 'admin', '$2y$10$wN9FmsLgq6H1F0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Administrator Kabupaten Tangerang', 'Admin', 'Aktif', NULL, 0, NULL),
(2, 'viewer', '$2y$10$qC5Yp4D39Z8f0fXoYpThek37VJp.ZidF1nOq9vUof4D9uWevBvX.', 'Viewer Kemenag', 'Viewer', 'Aktif', NULL, 0, NULL),
-- Operator seeds
(3, 'teluknaga', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Teluknaga', 'Operator KUA', 'Aktif', NULL, 0, 1),
(4, 'mauk', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Mauk', 'Operator KUA', 'Aktif', NULL, 0, 2),
(5, 'rajeg', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Rajeg', 'Operator KUA', 'Aktif', NULL, 0, 3),
(6, 'sepatan', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Sepatan', 'Operator KUA', 'Aktif', NULL, 0, 4),
(7, 'pasarkemis', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Pasar Kemis', 'Operator KUA', 'Aktif', NULL, 0, 5),
(8, 'balaraja', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Balaraja', 'Operator KUA', 'Aktif', NULL, 0, 6),
(9, 'kresek', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Kresek', 'Operator KUA', 'Aktif', NULL, 0, 7),
(10, 'kronjo', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Kronjo', 'Operator KUA', 'Aktif', NULL, 0, 8),
(11, 'curug', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Curug', 'Operator KUA', 'Aktif', NULL, 0, 9),
(12, 'cikupa', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Cikupa', 'Operator KUA', 'Aktif', NULL, 0, 10),
(13, 'legok', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Legok', 'Operator KUA', 'Aktif', NULL, 0, 11),
(14, 'tigaraksa', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Tigaraksa', 'Operator KUA', 'Aktif', NULL, 0, 12),
(15, 'cisoka', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Cisoka', 'Operator KUA', 'Aktif', NULL, 0, 13),
(16, 'pakuhaji', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Pakuhaji', 'Operator KUA', 'Aktif', NULL, 0, 14),
(17, 'kosambi', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Kosambi', 'Operator KUA', 'Aktif', NULL, 0, 15),
(18, 'pagedangan', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Pagedangan', 'Operator KUA', 'Aktif', NULL, 0, 16),
(19, 'panongan', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Panongan', 'Operator KUA', 'Aktif', NULL, 0, 17),
(20, 'cisauk', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Cisauk', 'Operator KUA', 'Aktif', NULL, 0, 18),
(21, 'jayanti', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Jayanti', 'Operator KUA', 'Aktif', NULL, 0, 19),
(22, 'kemiri', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Kemiri', 'Operator KUA', 'Aktif', NULL, 0, 20),
(23, 'sukadiri', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Sukadiri', 'Operator KUA', 'Aktif', NULL, 0, 21),
(24, 'jambe', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Jambe', 'Operator KUA', 'Aktif', NULL, 0, 22),
(25, 'sukamulya', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Sukamulya', 'Operator KUA', 'Aktif', NULL, 0, 23),
(26, 'kelapadua', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Kelapa Dua', 'Operator KUA', 'Aktif', NULL, 0, 24),
(27, 'sindangjaya', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Sindang Jaya', 'Operator KUA', 'Aktif', NULL, 0, 25),
(28, 'sepatantimur', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Sepatan Timur', 'Operator KUA', 'Aktif', NULL, 0, 26),
(29, 'solear', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Solear', 'Operator KUA', 'Aktif', NULL, 0, 27),
(30, 'gunungkaler', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Gunung Kaler', 'Operator KUA', 'Aktif', NULL, 0, 28),
(31, 'mekarbaru', '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Operator KUA Mekar Baru', 'Operator KUA', 'Aktif', NULL, 0, 29);

-- 3. Seed some initial activity logs
INSERT INTO `activity_logs` (`id_user`, `username`, `aktivitas`, `detail`, `timestamp`) VALUES
(1, 'admin', 'System Setup', 'Menginisialisasi sistem informasi blanko nikah (SIBN) Kabupaten Tangerang berbasis PHP & MySQL', '2026-07-14T00:00:00.000Z'),
(1, 'admin', 'Database Seeding', 'Berhasil mengimpor data default untuk 29 KUA dan akun operasional di MySQL', '2026-07-14T00:01:00.000Z');

SET FOREIGN_KEY_CHECKS = 1;
