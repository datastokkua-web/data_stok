import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "db.sqlite");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// Simple secure password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === verifyHash;
  } catch (err) {
    return false;
  }
}

// Initialize tables
export function initDB() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id_user INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nama TEXT NOT NULL,
      level TEXT NOT NULL, -- 'Admin', 'Operator KUA', 'Viewer'
      status TEXT DEFAULT 'Aktif',
      last_login TEXT,
      ganti_password INTEGER DEFAULT 0,
      id_kua INTEGER,
      FOREIGN KEY(id_kua) REFERENCES kua(id_kua) ON DELETE SET NULL
    )
  `);

  // 2. KUA Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS kua (
      id_kua INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_kua TEXT UNIQUE NOT NULL,
      alamat TEXT,
      kepala_kua TEXT,
      nip_kepala TEXT,
      pengelola_stok TEXT,
      nip_pengelola TEXT,
      operator TEXT,
      aktif INTEGER DEFAULT 1
    )
  `);

  // Run migrations to add columns if they don't exist
  try { db.exec("ALTER TABLE kua ADD COLUMN nip_kepala TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE kua ADD COLUMN pengelola_stok TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE kua ADD COLUMN nip_pengelola TEXT"); } catch (e) {}

  // 3. Laporan Stok Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS laporan_stok (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_kua INTEGER NOT NULL,
      tahun INTEGER NOT NULL,
      bulan TEXT NOT NULL,
      jenis TEXT NOT NULL, -- 'Masuk', 'Keluar', 'Rusak'
      subjenis TEXT NOT NULL, -- 'NB', 'N', 'NA'
      kategori TEXT DEFAULT '', -- 'Nikah', 'Isbat', 'Duplikat', or ''
      jumlah INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(id_kua, tahun, bulan, jenis, subjenis, kategori),
      FOREIGN KEY(id_kua) REFERENCES kua(id_kua) ON DELETE CASCADE
    )
  `);

  // 4. Upload PDF Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS upload_pdf (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_kua INTEGER NOT NULL,
      bulan TEXT NOT NULL,
      tahun INTEGER NOT NULL,
      nama_file TEXT NOT NULL,
      tanggal_upload TEXT NOT NULL,
      UNIQUE(id_kua, bulan, tahun),
      FOREIGN KEY(id_kua) REFERENCES kua(id_kua) ON DELETE CASCADE
    )
  `);

  // 5. Activity Log Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_user INTEGER,
      username TEXT NOT NULL,
      aktivitas TEXT NOT NULL,
      detail TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  // Seed KUA list if empty
  const countKua = db.prepare("SELECT count(*) as count FROM kua").get() as { count: number };
  if (countKua.count === 0) {
    const listKua = [
      { nama: "Teluknaga", alamat: "Jl. Raya Teluknaga, Tangerang", kepala: "H. Ahmad S.Ag", operator: "operator_teluknaga" },
      { nama: "Mauk", alamat: "Jl. Raya Mauk, Tangerang", kepala: "Drs. Syarifuddin", operator: "operator_mauk" },
      { nama: "Rajeg", alamat: "Jl. Raya Rajeg No. 12, Tangerang", kepala: "H. Mulyadi S.HI", operator: "operator_rajeg" },
      { nama: "Sepatan", alamat: "Jl. Raya Sepatan, Tangerang", kepala: "Drs. H. Sanusi", operator: "operator_sepatan" },
      { nama: "Pasar Kemis", alamat: "Jl. Raya Pasar Kemis, Tangerang", kepala: "H. Sukarnawijaya S.Ag", operator: "operator_pasarkemis" },
      { nama: "Balaraja", alamat: "Jl. Raya Balaraja, Tangerang", kepala: "H. Syahroni S.Ag", operator: "operator_balaraja" },
      { nama: "Kresek", alamat: "Jl. Raya Kresek, Tangerang", kepala: "Drs. H. Anwar", operator: "operator_kresek" },
      { nama: "Kronjo", alamat: "Jl. Raya Kronjo, Tangerang", kepala: "H. Safei S.HI", operator: "operator_kronjo" },
      { nama: "Curug", alamat: "Jl. Raya Curug, Tangerang", kepala: "H. Nasrullah S.Ag", operator: "operator_curug" },
      { nama: "Cikupa", alamat: "Jl. Raya Cikupa, Tangerang", kepala: "H. M. Yusuf S.Ag", operator: "operator_cikupa" },
      { nama: "Legok", alamat: "Jl. Raya Legok, Tangerang", kepala: "Drs. H. Hamdan", operator: "operator_legok" },
      { nama: "Tigaraksa", alamat: "Jl. Raya Tigaraksa No. 5, Tangerang", kepala: "H. Ujang S.HI", operator: "operator_tigaraksa" },
      { nama: "Cisoka", alamat: "Jl. Raya Cisoka, Tangerang", kepala: "H. Subur S.Ag", operator: "operator_cisoka" },
      { nama: "Pakuhaji", alamat: "Jl. Raya Pakuhaji, Tangerang", kepala: "Drs. H. Kosasih", operator: "operator_pakuhaji" },
      { nama: "Kosambi", alamat: "Jl. Raya Kosambi, Tangerang", kepala: "H. Zaenal Abidin S.Ag", operator: "operator_kosambi" },
      { nama: "Pagedangan", alamat: "Jl. Raya Pagedangan, Tangerang", kepala: "Drs. H. Junaedi", operator: "operator_pagedangan" },
      { nama: "Panongan", alamat: "Jl. Raya Panongan, Tangerang", kepala: "H. Mahmud S.HI", operator: "operator_panongan" },
      { nama: "Cisauk", alamat: "Jl. Raya Cisauk, Tangerang", kepala: "Drs. H. Mansyur", operator: "operator_cisauk" },
      { nama: "Jayanti", alamat: "Jl. Raya Jayanti, Tangerang", kepala: "H. Ahmad Fauzi S.Ag", operator: "operator_jayanti" },
      { nama: "Kemiri", alamat: "Jl. Raya Kemiri, Tangerang", kepala: "Drs. H. Ridwan", operator: "operator_kemiri" },
      { nama: "Sukadiri", alamat: "Jl. Raya Sukadiri, Tangerang", kepala: "H. Mas'ud S.Ag", operator: "operator_sukadiri" },
      { nama: "Jambe", alamat: "Jl. Raya Jambe, Tangerang", kepala: "Drs. H. Rustam", operator: "operator_jambe" },
      { nama: "Sukamulya", alamat: "Jl. Raya Sukamulya, Tangerang", kepala: "H. Mahfudz S.HI", operator: "operator_sukamulya" },
      { nama: "Kelapa Dua", alamat: "Jl. Raya Kelapa Dua, Tangerang", kepala: "H. Solihin S.Ag", operator: "operator_kelapadua" },
      { nama: "Sindang Jaya", alamat: "Jl. Raya Sindang Jaya, Tangerang", kepala: "Drs. H. Yahya", operator: "operator_sindangjaya" },
      { nama: "Sepatan Timur", alamat: "Jl. Raya Sepatan Timur, Tangerang", kepala: "H. Mukhtar S.Ag", operator: "operator_sepatantimur" },
      { nama: "Solear", alamat: "Jl. Raya Solear, Tangerang", kepala: "H. Sobari S.Ag", operator: "operator_solear" },
      { nama: "Gunung Kaler", alamat: "Jl. Raya Gunung Kaler, Tangerang", kepala: "Drs. H. Badri", operator: "operator_gunungkaler" },
      { nama: "Mekar Baru", alamat: "Jl. Raya Mekar Baru, Tangerang", kepala: "H. Abdul Jamil S.Ag", operator: "operator_mekarbaru" }
    ];

    const insertKua = db.prepare(`
      INSERT INTO kua (nama_kua, alamat, kepala_kua, operator, aktif)
      VALUES (?, ?, ?, ?, 1)
    `);

    listKua.forEach(k => {
      insertKua.run(k.nama, k.alamat, k.kepala, k.operator);
    });
  }

  // Seed default Users if empty
  const countUsers = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
  if (countUsers.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, nama, level, status, id_kua)
      VALUES (?, ?, ?, ?, 'Aktif', ?)
    `);

    // 1. Seed Admin
    insertUser.run("admin", hashPassword("admin123"), "Administrator Kabupaten Tangerang", "Admin", null);

    // 2. Seed Viewer
    insertUser.run("viewer", hashPassword("viewer123"), "Viewer Kemenag", "Viewer", null);

    // 3. Seed Operators for each KUA
    const kuas = db.prepare("SELECT id_kua, nama_kua FROM kua").all() as { id_kua: number, nama_kua: string }[];
    kuas.forEach(k => {
      const username = k.nama_kua.toLowerCase().replace(/\s+/g, "");
      const passwordVal = username === "rajeg" ? "12345" : "12345"; // All default operator passwords are 12345
      insertUser.run(username, hashPassword(passwordVal), `Operator KUA ${k.nama_kua}`, "Operator KUA", k.id_kua);
    });

    // Seed some dummy stock data and uploads for a beautiful dashboard initial look!
    // We can do this dynamically or manually for testing. Let's do it for Apr, Mei, Jun, Jul 2026!
    // Let's seed for Rajeg (id_kua = 3) and Curug (id_kua = 9) to populate our stats.
    // The user mentioned in Card 3 click: "Rajeg, Curug, Mauk, Kemiri belum input bulan April, Mei, Juni"
    // So let's make most KUAs have reports input for April, Mei, Juni, Juli, and leave a few as uninput!
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli"];
    const insertStok = db.prepare(`
      INSERT OR REPLACE INTO laporan_stok (id_kua, tahun, bulan, jenis, subjenis, kategori, jumlah, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const nowStr = new Date().toISOString();

    // Let's seed 25 KUAs as "Sudah Input" and 4 KUAs as "Belum Input"
    // 4 Belum Input: Rajeg, Curug, Mauk, Kemiri
    // 25 Sudah Input: all other KUAs
    // Let's do this by looping over kuas
    kuas.forEach(k => {
      const isUninputKua = ["Rajeg", "Curug", "Mauk", "Kemiri"].includes(k.nama_kua);
      if (!isUninputKua) {
        // Seed reports for Januari - Juni 2026
        months.forEach(m => {
          if (m !== "Juli") { // Most have input up to June, let's say 25 are completely input for Jan-Jun
            // NB Masuk, N Masuk, NA Masuk
            insertStok.run(k.id_kua, 2026, m, "Masuk", "NB", "", 100, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Masuk", "N", "", 50, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Masuk", "NA", "", 75, nowStr, nowStr);

            // NB Keluar Nikah, Isbat, Duplikat
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NB", "Nikah", 20, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NB", "Isbat", 5, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NB", "Duplikat", 2, nowStr, nowStr);

            // N Keluar Nikah, Isbat, Duplikat
            insertStok.run(k.id_kua, 2026, m, "Keluar", "N", "Nikah", 15, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "N", "Isbat", 2, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "N", "Duplikat", 1, nowStr, nowStr);

            // NA Keluar Nikah, Isbat, Duplikat
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NA", "Nikah", 25, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NA", "Isbat", 3, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NA", "Duplikat", 2, nowStr, nowStr);

            // Rusak
            insertStok.run(k.id_kua, 2026, m, "Rusak", "NB", "Nikah", 1, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Rusak", "N", "Nikah", 1, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Rusak", "NA", "Nikah", 1, nowStr, nowStr);
          }
        });
      } else {
        // For uninput, only seed Januari - Maret 2026. April, Mei, Juni are missing!
        months.forEach(m => {
          if (["Januari", "Februari", "Maret"].includes(m)) {
            insertStok.run(k.id_kua, 2026, m, "Masuk", "NB", "", 80, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Masuk", "N", "", 40, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Masuk", "NA", "", 60, nowStr, nowStr);

            insertStok.run(k.id_kua, 2026, m, "Keluar", "NB", "Nikah", 18, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "N", "Nikah", 14, nowStr, nowStr);
            insertStok.run(k.id_kua, 2026, m, "Keluar", "NA", "Nikah", 22, nowStr, nowStr);
          }
        });
      }
    });

    // Seed PDF uploads
    // "Sudah Upload PDF: 27, Belum Upload PDF: 2"
    // Let's seed for 27 KUAs having PDF uploaded for Juni 2026.
    // 2 Belum Upload: Rajeg and Curug.
    const insertPdf = db.prepare(`
      INSERT OR REPLACE INTO upload_pdf (id_kua, bulan, tahun, nama_file, tanggal_upload)
      VALUES (?, ?, ?, ?, ?)
    `);
    kuas.forEach(k => {
      const isBelumPdf = ["Rajeg", "Curug"].includes(k.nama_kua);
      if (!isBelumPdf) {
        insertPdf.run(k.id_kua, "Juni", 2026, `${k.nama_kua}_Juni_2026.pdf`, nowStr);
        // Also seed other months
        insertPdf.run(k.id_kua, "Mei", 2026, `${k.nama_kua}_Mei_2026.pdf`, nowStr);
      } else {
        // Only seed up to Maret
        insertPdf.run(k.id_kua, "Maret", 2026, `${k.nama_kua}_Maret_2026.pdf`, nowStr);
      }
    });

    // Seed initial activity logs
    const insertLog = db.prepare(`
      INSERT INTO activity_logs (id_user, username, aktivitas, detail, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLog.run(1, "admin", "System Setup", "Menginisialisasi sistem informasi blanko nikah (SIBN) Kabupaten Tangerang", nowStr);
    insertLog.run(1, "admin", "Database Seeding", "Berhasil men-seed data default untuk 29 KUA dan akun operasional", nowStr);
  }
}

// Log activities
export function addLog(idUser: number | null, username: string, aktivitas: string, detail: string) {
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (id_user, username, aktivitas, detail, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertLog.run(idUser, username, aktivitas, detail, new Date().toISOString());
}
