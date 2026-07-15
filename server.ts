import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { db, initDB, hashPassword, verifyPassword, addLog } from "./server/db.js";

// Note: Using relative ESM imports with .js extension as per modern standard or tsx compatibility
// Let's first initialize database
initDB();

const app = express();
const PORT = 3000;

// Middleware for parsing requests
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Simple CSRF Protection
// We will look for a custom header "X-XSRF-TOKEN" which must match the session CSRF token
const csrfTokenSecret = "SIBN_CSRF_SECRET_2026";
function generateCsrfToken(userId: number): string {
  return crypto.createHmac("sha256", csrfTokenSecret).update(userId.toString() + "_csrf").digest("hex");
}

// Token Auth Middleware
const JWT_SECRET = "SIBN_JWT_SECRET_KEY_FOR_SECURE_TOKEN_SESSIONS";

function createToken(user: any): string {
  const payload = {
    id_user: user.id_user,
    username: user.username,
    nama: user.nama,
    level: user.level,
    id_kua: user.id_kua,
    ganti_password: user.ganti_password,
    csrfToken: generateCsrfToken(user.id_user)
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
  return `${data}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    if (!token) return null;
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  } catch (err) {
    return null;
  }
}

// Auth Middleware Express
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"] || req.headers["x-auth-token"];
  let token = "";
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(419).json({ message: "Sesi Anda telah berakhir. Silakan login kembali." });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(419).json({ message: "Token tidak valid atau kedaluwarsa." });
  }

  // Inject user info
  req.user = decoded;

  // Validate CSRF for mutable methods (POST, PUT, DELETE)
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const clientCsrf = req.headers["x-xsrf-token"] || req.body._csrf;
    if (!clientCsrf || clientCsrf !== decoded.csrfToken) {
      return res.status(403).json({ message: "Validasi CSRF gagal. Permintaan tidak aman." });
    }
  }

  next();
}

// Helper to escape output
function escapeHtml(str: string): string {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[tag] || tag)
  );
}

// Helper to check if a report is locked (5 days after first input, only Admins can edit/delete)
function checkReportLock(id_kua: number, bulan: string, tahun: number, level: string): { isLocked: boolean; message?: string } {
  if (level === "Admin") {
    return { isLocked: false };
  }

  try {
    // 1. Get minimum created_at from laporan_stok
    const firstInput = db.prepare(`
      SELECT MIN(created_at) as first_input 
      FROM laporan_stok 
      WHERE id_kua = ? AND bulan = ? AND tahun = ?
    `).get(id_kua, bulan, tahun) as any;

    let earliestTime: number | null = null;

    if (firstInput && firstInput.first_input) {
      earliestTime = new Date(firstInput.first_input).getTime();
    }

    // 2. Also check upload_pdf tanggal_upload
    const pdfInput = db.prepare(`
      SELECT tanggal_upload 
      FROM upload_pdf 
      WHERE id_kua = ? AND bulan = ? AND tahun = ?
    `).get(id_kua, bulan, tahun) as any;

    if (pdfInput && pdfInput.tanggal_upload) {
      const pdfTime = new Date(pdfInput.tanggal_upload).getTime();
      if (earliestTime === null || pdfTime < earliestTime) {
        earliestTime = pdfTime;
      }
    }

    if (earliestTime !== null) {
      const elapsedMs = Date.now() - earliestTime;
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      if (elapsedDays > 5) {
        const formattedDate = new Date(earliestTime).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        return { 
          isLocked: true, 
          message: `Batas waktu pengisian/perubahan data (5 hari setelah input pertama pada ${formattedDate}) telah berakhir. Hanya Administrator yang dapat mengubah atau menghapus data ini.` 
        };
      }
    }
  } catch (err) {
    console.error("Error checking report lock:", err);
  }

  return { isLocked: false };
}

// Multer Storage for PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req: any, file, cb) => {
    // We name it in the route where we have access to req.body parameters (bulan, tahun, id_kua)
    // Here we use a temp name and rename it or handle it in the route
    cb(null, `temp_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept PDF
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Hanya file PDF yang diperbolehkan!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});


// ==========================================
// API ROUTES
// ==========================================

// 1. Authentication
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi." });
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (!user) {
      return res.status(401).json({ message: "Username atau Password salah." });
    }

    if (user.status !== "Aktif") {
      return res.status(403).json({ message: "Akun Anda telah dinonaktifkan. Hubungi admin." });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Username atau Password salah." });
    }

    // Generate token
    const token = createToken(user);

    // Update last login
    const nowStr = new Date().toISOString();
    db.prepare("UPDATE users SET last_login = ? WHERE id_user = ?").run(nowStr, user.id_user);

    // Log Activity
    addLog(user.id_user, user.username, "Login", "Berhasil masuk ke dalam sistem");

    return res.json({
      token,
      user: {
        id_user: user.id_user,
        username: user.username,
        nama: user.nama,
        level: user.level,
        id_kua: user.id_kua,
        ganti_password: user.ganti_password,
        csrfToken: generateCsrfToken(user.id_user)
      }
    });
  } catch (err: any) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// Get current user info
app.get("/api/auth/me", authenticate, (req: any, res) => {
  return res.json({ user: req.user });
});

// Change Password
app.post("/api/auth/change-password", authenticate, (req: any, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Password lama dan baru wajib diisi." });
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE id_user = ?").get(req.user.id_user) as any;
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    const valid = verifyPassword(oldPassword, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Password lama salah." });
    }

    const hashed = hashPassword(newPassword);
    db.prepare("UPDATE users SET password = ?, ganti_password = 1 WHERE id_user = ?")
      .run(hashed, req.user.id_user);

    addLog(user.id_user, user.username, "Ganti Password", "Berhasil mengganti password akun");

    return res.json({ success: true, message: "Password berhasil diperbarui." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal mengganti password." });
  }
});

// 2. KUA Management
app.get("/api/kua", authenticate, (req: any, res) => {
  try {
    // If Operator, they only see their KUA
    if (req.user.level === "Operator KUA" && req.user.id_kua) {
      const kua = db.prepare("SELECT * FROM kua WHERE id_kua = ?").get(req.user.id_kua);
      return res.json(kua ? [kua] : []);
    }

    const kuas = db.prepare("SELECT * FROM kua ORDER BY nama_kua ASC").all();
    return res.json(kuas);
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memuat data KUA." });
  }
});

// Create KUA (Admin Only)
app.post("/api/kua", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya Admin yang diizinkan." });
  }

  const { nama_kua, alamat, kepala_kua, nip_kepala, pengelola_stok, nip_pengelola, operator, aktif } = req.body;
  if (!nama_kua) {
    return res.status(400).json({ message: "Nama KUA wajib diisi." });
  }

  try {
    const isExist = db.prepare("SELECT id_kua FROM kua WHERE nama_kua = ?").get(nama_kua);
    if (isExist) {
      return res.status(400).json({ message: "KUA dengan nama tersebut sudah terdaftar." });
    }

    const result = db.prepare(`
      INSERT INTO kua (nama_kua, alamat, kepala_kua, nip_kepala, pengelola_stok, nip_pengelola, operator, aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      escapeHtml(nama_kua),
      escapeHtml(alamat || ""),
      escapeHtml(kepala_kua || ""),
      escapeHtml(nip_kepala || ""),
      escapeHtml(pengelola_stok || ""),
      escapeHtml(nip_pengelola || ""),
      escapeHtml(operator || ""),
      aktif === false ? 0 : 1
    );

    // Auto create operator user for this KUA if not exists
    const opUsername = nama_kua.toLowerCase().replace(/\s+/g, "");
    const userExist = db.prepare("SELECT id_user FROM users WHERE username = ?").get(opUsername);
    if (!userExist) {
      db.prepare(`
        INSERT INTO users (username, password, nama, level, status, id_kua)
        VALUES (?, ?, ?, 'Operator KUA', 'Aktif', ?)
      `).run(opUsername, hashPassword("12345"), `Operator KUA ${nama_kua}`, result.lastInsertRowid);
    }

    addLog(req.user.id_user, req.user.username, "Tambah KUA", `Menambahkan master KUA baru: ${nama_kua}`);

    return res.json({ success: true, message: "KUA berhasil ditambahkan." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal menyimpan data KUA." });
  }
});

// Update KUA (Admin & Operator can update details, but level restrictions apply)
app.put("/api/kua/:id", authenticate, (req: any, res) => {
  const { id } = req.params;
  const { nama_kua, alamat, kepala_kua, nip_kepala, pengelola_stok, nip_pengelola, operator, aktif } = req.body;

  if (req.user.level !== "Admin" && Number(id) !== req.user.id_kua) {
    return res.status(403).json({ message: "Anda tidak memiliki izin mengedit KUA ini." });
  }

  try {
    const current = db.prepare("SELECT * FROM kua WHERE id_kua = ?").get(id) as any;
    if (!current) {
      return res.status(404).json({ message: "KUA tidak ditemukan." });
    }

    // Only Admin can toggle active status or change KUA name
    if (req.user.level === "Admin") {
      db.prepare(`
        UPDATE kua 
        SET nama_kua = ?, alamat = ?, kepala_kua = ?, nip_kepala = ?, pengelola_stok = ?, nip_pengelola = ?, operator = ?, aktif = ?
        WHERE id_kua = ?
      `).run(
        escapeHtml(nama_kua || current.nama_kua),
        escapeHtml(alamat || ""),
        escapeHtml(kepala_kua || ""),
        escapeHtml(nip_kepala || ""),
        escapeHtml(pengelola_stok || ""),
        escapeHtml(nip_pengelola || ""),
        escapeHtml(operator || ""),
        aktif === false ? 0 : 1,
        id
      );
    } else {
      // Operator can only update address, head of KUA, and pengelola details
      db.prepare(`
        UPDATE kua 
        SET alamat = ?, kepala_kua = ?, nip_kepala = ?, pengelola_stok = ?, nip_pengelola = ?
        WHERE id_kua = ?
      `).run(
        escapeHtml(alamat || ""),
        escapeHtml(kepala_kua || ""),
        escapeHtml(nip_kepala || ""),
        escapeHtml(pengelola_stok || ""),
        escapeHtml(nip_pengelola || ""),
        id
      );
    }

    addLog(req.user.id_user, req.user.username, "Edit KUA", `Mengupdate rincian KUA: ${current.nama_kua}`);

    return res.json({ success: true, message: "KUA berhasil diperbarui." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memperbarui data KUA." });
  }
});

// Delete KUA (Admin Only)
app.delete("/api/kua/:id", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Hanya Admin yang diizinkan." });
  }

  const { id } = req.params;
  try {
    const current = db.prepare("SELECT nama_kua FROM kua WHERE id_kua = ?").get(id) as any;
    if (!current) {
      return res.status(404).json({ message: "KUA tidak ditemukan." });
    }

    db.prepare("DELETE FROM kua WHERE id_kua = ?").run(id);
    db.prepare("DELETE FROM users WHERE id_kua = ?").run(id);

    addLog(req.user.id_user, req.user.username, "Hapus KUA", `Menghapus KUA dan Operator terkait: ${current.nama_kua}`);

    return res.json({ success: true, message: "KUA berhasil dihapus." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal menghapus KUA." });
  }
});

// 3. User Management (Admin Only)
app.get("/api/users", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses terbatas." });
  }

  try {
    const users = db.prepare(`
      SELECT u.*, k.nama_kua 
      FROM users u
      LEFT JOIN kua k ON u.id_kua = k.id_kua
      ORDER BY u.id_user ASC
    `).all();
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memuat daftar user." });
  }
});

app.post("/api/users", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses terbatas." });
  }

  const { username, password, nama, level, status, id_kua } = req.body;
  if (!username || !password || !nama || !level) {
    return res.status(400).json({ message: "Data tidak lengkap." });
  }

  try {
    const isExist = db.prepare("SELECT id_user FROM users WHERE username = ?").get(username.toLowerCase());
    if (isExist) {
      return res.status(400).json({ message: "Username sudah digunakan." });
    }

    db.prepare(`
      INSERT INTO users (username, password, nama, level, status, id_kua)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      username.toLowerCase().replace(/\s+/g, ""),
      hashPassword(password),
      escapeHtml(nama),
      level,
      status || "Aktif",
      level === "Operator KUA" ? id_kua : null
    );

    addLog(req.user.id_user, req.user.username, "Tambah User", `Menambahkan user baru: ${username}`);

    return res.json({ success: true, message: "User berhasil dibuat." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal membuat user baru." });
  }
});

app.put("/api/users/:id", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses terbatas." });
  }

  const { id } = req.params;
  const { nama, level, status, id_kua, password } = req.body;

  try {
    const current = db.prepare("SELECT * FROM users WHERE id_user = ?").get(id) as any;
    if (!current) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    if (password) {
      db.prepare(`
        UPDATE users 
        SET nama = ?, level = ?, status = ?, id_kua = ?, password = ?, ganti_password = 0
        WHERE id_user = ?
      `).run(
        escapeHtml(nama || current.nama),
        level || current.level,
        status || current.status,
        level === "Operator KUA" ? id_kua : null,
        hashPassword(password),
        id
      );
    } else {
      db.prepare(`
        UPDATE users 
        SET nama = ?, level = ?, status = ?, id_kua = ?
        WHERE id_user = ?
      `).run(
        escapeHtml(nama || current.nama),
        level || current.level,
        status || current.status,
        level === "Operator KUA" ? id_kua : null,
        id
      );
    }

    addLog(req.user.id_user, req.user.username, "Edit User", `Mengubah data user: ${current.username}`);

    return res.json({ success: true, message: "User berhasil diperbarui." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memperbarui user." });
  }
});

app.delete("/api/users/:id", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses terbatas." });
  }

  const { id } = req.params;
  if (Number(id) === req.user.id_user) {
    return res.status(400).json({ message: "Anda tidak dapat menghapus akun Anda sendiri." });
  }

  try {
    const current = db.prepare("SELECT username FROM users WHERE id_user = ?").get(id) as any;
    if (!current) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    db.prepare("DELETE FROM users WHERE id_user = ?").run(id);

    addLog(req.user.id_user, req.user.username, "Hapus User", `Menghapus akun user: ${current.username}`);

    return res.json({ success: true, message: "User berhasil dihapus." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal menghapus user." });
  }
});


// 4. Laporan Stok (Input, Read, Pivot Data)
// Get Pivot table for selected KUA and year
app.get("/api/stok/pivot", authenticate, (req: any, res) => {
  const { id_kua, tahun } = req.query;
  if (!id_kua || !tahun) {
    return res.status(400).json({ message: "KUA dan Tahun wajib dipilih." });
  }

  // Security: Operator can only see their KUA
  if (req.user.level === "Operator KUA" && Number(id_kua) !== req.user.id_kua) {
    return res.status(403).json({ message: "Akses terbatas ke KUA Anda sendiri." });
  }

  try {
    const query = `
      SELECT jenis, subjenis, kategori,
        SUM(CASE WHEN bulan = 'Januari' THEN jumlah ELSE 0 END) as Jan,
        SUM(CASE WHEN bulan = 'Februari' THEN jumlah ELSE 0 END) as Feb,
        SUM(CASE WHEN bulan = 'Maret' THEN jumlah ELSE 0 END) as Mar,
        SUM(CASE WHEN bulan = 'April' THEN jumlah ELSE 0 END) as Apr,
        SUM(CASE WHEN bulan = 'Mei' THEN jumlah ELSE 0 END) as Mei,
        SUM(CASE WHEN bulan = 'Juni' THEN jumlah ELSE 0 END) as Jun,
        SUM(CASE WHEN bulan = 'Juli' THEN jumlah ELSE 0 END) as Jul,
        SUM(CASE WHEN bulan = 'Agustus' THEN jumlah ELSE 0 END) as Ags,
        SUM(CASE WHEN bulan = 'September' THEN jumlah ELSE 0 END) as Sep,
        SUM(CASE WHEN bulan = 'Oktober' THEN jumlah ELSE 0 END) as Okt,
        SUM(CASE WHEN bulan = 'November' THEN jumlah ELSE 0 END) as Nov,
        SUM(CASE WHEN bulan = 'Desember' THEN jumlah ELSE 0 END) as Des,
        SUM(jumlah) as Jumlah
      FROM laporan_stok
      WHERE id_kua = ? AND tahun = ?
      GROUP BY jenis, subjenis, kategori
    `;

    const rawRows = db.prepare(query).all(id_kua, tahun) as any[];
    return res.json(rawRows);
  } catch (err: any) {
    console.error("Pivot error:", err);
    return res.status(500).json({ message: "Gagal memproses rekapitulasi stok." });
  }
});

// Get existing inputs for a specific KUA, month, year (e.g. for input editing)
app.get("/api/stok/detail", authenticate, (req: any, res) => {
  const { id_kua, bulan, tahun } = req.query;
  if (!id_kua || !bulan || !tahun) {
    return res.status(400).json({ message: "Parameter tidak lengkap." });
  }

  if (req.user.level === "Operator KUA" && Number(id_kua) !== req.user.id_kua) {
    return res.status(403).json({ message: "Akses ditolak." });
  }

  try {
    const rows = db.prepare(`
      SELECT jenis, subjenis, kategori, jumlah 
      FROM laporan_stok 
      WHERE id_kua = ? AND bulan = ? AND tahun = ?
    `).all(id_kua, bulan, tahun);

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memuat rincian stok." });
  }
});

// Check Report Lock Status (5 days limit)
app.get("/api/stok/lock-status", authenticate, (req: any, res) => {
  const { id_kua, bulan, tahun } = req.query;
  if (!id_kua || !bulan || !tahun) {
    return res.status(400).json({ message: "Parameter tidak lengkap." });
  }

  if (req.user.level === "Operator KUA" && Number(id_kua) !== req.user.id_kua) {
    return res.status(403).json({ message: "Akses ditolak." });
  }

  const status = checkReportLock(Number(id_kua), String(bulan), Number(tahun), req.user.level);
  return res.json(status);
});

// Save Stock Entry (Batch)
app.post("/api/stok/input", authenticate, (req: any, res) => {
  const { id_kua, bulan, tahun, items, isEdit } = req.body;

  if (!id_kua || !bulan || !tahun || !Array.isArray(items)) {
    return res.status(400).json({ message: "Format input tidak valid." });
  }

  if (req.user.level === "Operator KUA" && Number(id_kua) !== req.user.id_kua) {
    return res.status(403).json({ message: "Anda tidak diizinkan mengisi KUA lain." });
  }

  // Check 5-day lock rule
  const lockStatus = checkReportLock(Number(id_kua), bulan, Number(tahun), req.user.level);
  if (lockStatus.isLocked) {
    return res.status(403).json({ message: lockStatus.message });
  }

  try {
    // Check if double input (already exists for new inputs)
    if (!isEdit) {
      const existing = db.prepare(`
        SELECT count(*) as count FROM laporan_stok 
        WHERE id_kua = ? AND bulan = ? AND tahun = ?
      `).get(id_kua, bulan, tahun) as any;

      if (existing.count > 0) {
        return res.status(400).json({ message: `Data laporan untuk KUA tersebut pada bulan ${bulan} ${tahun} sudah pernah diinput.` });
      }
    }

    const nowStr = new Date().toISOString();

    const insertOrReplace = db.prepare(`
      INSERT INTO laporan_stok (id_kua, tahun, bulan, jenis, subjenis, kategori, jumlah, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id_kua, tahun, bulan, jenis, subjenis, kategori) DO UPDATE SET
        jumlah = excluded.jumlah,
        updated_at = excluded.updated_at
    `);

    // We run the inputs inside an SQLite transaction for atomicity!
    const transaction = db.transaction(() => {
      for (const item of items) {
        const { jenis, subjenis, kategori, jumlah } = item;
        
        // Strict validations
        const parsedJumlah = parseInt(jumlah, 10);
        if (isNaN(parsedJumlah) || parsedJumlah < 0) {
          throw new Error("Jumlah harus berupa angka positif!");
        }

        insertOrReplace.run(id_kua, tahun, bulan, jenis, subjenis, kategori || "", parsedJumlah, nowStr, nowStr);
      }
    });

    transaction();

    const kuaName = db.prepare("SELECT nama_kua FROM kua WHERE id_kua = ?").get(id_kua) as any;
    addLog(req.user.id_user, req.user.username, "Input Laporan", `Menginput/mengedit laporan stok KUA ${kuaName?.nama_kua || id_kua} - ${bulan} ${tahun}`);

    return res.json({ success: true, message: "Laporan stok berhasil disimpan." });
  } catch (err: any) {
    console.error("Input error:", err);
    return res.status(400).json({ message: err.message || "Gagal menyimpan laporan stok." });
  }
});


// 5. Upload PDF
app.post("/api/pdf/upload", authenticate, upload.single("file"), (req: any, res) => {
  const { id_kua, bulan, tahun } = req.body;
  if (!id_kua || !bulan || !tahun || !req.file) {
    // Delete temp file if exist
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ message: "Data tidak lengkap." });
  }

  if (req.user.level === "Operator KUA" && Number(id_kua) !== req.user.id_kua) {
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ message: "Akses terbatas ke KUA Anda sendiri." });
  }

  // Check 5-day lock rule
  const lockStatus = checkReportLock(Number(id_kua), bulan, Number(tahun), req.user.level);
  if (lockStatus.isLocked) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(403).json({ message: lockStatus.message });
  }

  try {
    const kua = db.prepare("SELECT nama_kua FROM kua WHERE id_kua = ?").get(id_kua) as any;
    if (!kua) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "KUA tidak ditemukan." });
    }

    // Generate strict name: e.g. Rajeg_Januari_2026.pdf
    const sanitizedKuaName = kua.nama_kua.replace(/\s+/g, "_");
    const targetFilename = `${sanitizedKuaName}_${bulan}_${tahun}.pdf`;
    const targetPath = path.join(process.cwd(), "uploads", targetFilename);

    // If already exists, replace it (unlink first)
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    // Rename temp file to our specific name format
    fs.renameSync(req.file.path, targetPath);

    const nowStr = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO upload_pdf (id_kua, bulan, tahun, nama_file, tanggal_upload)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id_kua, bulan, tahun) DO UPDATE SET
        nama_file = excluded.nama_file,
        tanggal_upload = excluded.tanggal_upload
    `).run(id_kua, bulan, tahun, targetFilename, nowStr);

    addLog(req.user.id_user, req.user.username, "Upload PDF", `Berhasil mengunggah dokumen PDF: ${targetFilename}`);

    return res.json({ success: true, message: "File PDF berhasil diunggah.", filename: targetFilename });
  } catch (err: any) {
    console.error("PDF upload error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: "Gagal mengunggah PDF." });
  }
});

// View PDF
app.get("/api/pdf/view/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), "uploads", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File PDF tidak ditemukan.");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(filePath);
});

// Get list of PDF uploads
app.get("/api/pdf", authenticate, (req: any, res) => {
  try {
    let query = `
      SELECT p.*, k.nama_kua 
      FROM upload_pdf p
      LEFT JOIN kua k ON p.id_kua = k.id_kua
    `;
    let params: any[] = [];

    if (req.user.level === "Operator KUA" && req.user.id_kua) {
      query += " WHERE p.id_kua = ?";
      params.push(req.user.id_kua);
    }

    query += " ORDER BY p.tanggal_upload DESC";

    const uploads = db.prepare(query).all(...params);
    return res.json(uploads);
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memuat data PDF." });
  }
});

// Delete PDF (Admin and Owner Operator only)
app.delete("/api/pdf/:id", authenticate, (req: any, res) => {
  const { id } = req.params;
  try {
    const item = db.prepare("SELECT * FROM upload_pdf WHERE id = ?").get(id) as any;
    if (!item) {
      return res.status(404).json({ message: "PDF tidak ditemukan." });
    }

    if (req.user.level === "Operator KUA" && item.id_kua !== req.user.id_kua) {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    // Check 5-day lock rule
    const lockStatus = checkReportLock(item.id_kua, item.bulan, item.tahun, req.user.level);
    if (lockStatus.isLocked) {
      return res.status(403).json({ message: lockStatus.message });
    }

    // Delete physically
    const filePath = path.join(process.cwd(), "uploads", item.nama_file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare("DELETE FROM upload_pdf WHERE id = ?").run(id);

    addLog(req.user.id_user, req.user.username, "Hapus PDF", `Menghapus dokumen PDF: ${item.nama_file}`);

    return res.json({ success: true, message: "Dokumen PDF berhasil dihapus." });
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal menghapus PDF." });
  }
});


// 6. Dashboard Statistics (Super powerful stats calculations!)
app.get("/api/dashboard/stats", authenticate, (req: any, res) => {
  const { bulan = "Juli", tahun = 2026 } = req.query;
  const targetTahun = parseInt(tahun, 10);

  try {
    // 1. Total active KUA
    const totalKuaRes = db.prepare("SELECT count(*) as count FROM kua WHERE aktif = 1").get() as any;
    const totalKua = totalKuaRes.count;

    // 2. KUA that have input for selected month/year
    const sudahInputQuery = `
      SELECT DISTINCT id_kua FROM laporan_stok 
      WHERE tahun = ? AND bulan = ?
    `;
    const sudahInputList = db.prepare(sudahInputQuery).all(targetTahun, bulan).map((r: any) => r.id_kua);
    const sudahInputCount = sudahInputList.length;
    const belumInputCount = Math.max(0, totalKua - sudahInputCount);

    // List of KUA details that have NOT input
    const belumInputKuas = db.prepare(`
      SELECT id_kua, nama_kua FROM kua 
      WHERE aktif = 1 AND id_kua NOT IN (
        SELECT DISTINCT id_kua FROM laporan_stok WHERE tahun = ? AND bulan = ?
      )
    `).all(targetTahun, bulan) as any[];

    // Let's also find all missing months for Rajeg, Curug, Mauk, Kemiri for Card 3 popup
    // "Klik muncul Rajeg, Curug, Mauk, Kemiri beserta bulan April, Mei, Juni"
    // We can fetch uninput months dynamically for 2026 for any KUA
    const listKuaUninputDetail = db.prepare(`
      SELECT id_kua, nama_kua FROM kua WHERE aktif = 1
    `).all() as any[];

    const testMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const unresolvedUninput: any[] = [];
    
    listKuaUninputDetail.forEach(k => {
      // Find which of testMonths have no records for this KUA in targetTahun
      const inputMonths = db.prepare(`
        SELECT DISTINCT bulan FROM laporan_stok WHERE id_kua = ? AND tahun = ?
      `).all(k.id_kua, targetTahun).map((r: any) => r.bulan);

      const missing = testMonths.filter(m => !inputMonths.includes(m));
      // Only include missing months up to the selected month (or all)
      const selectedMonthIndex = testMonths.indexOf(bulan);
      const missingUpToNow = missing.filter(m => testMonths.indexOf(m) <= selectedMonthIndex);

      if (missingUpToNow.length > 0) {
        unresolvedUninput.push({
          nama_kua: k.nama_kua,
          missingMonths: missingUpToNow
        });
      }
    });

    // 3. Already Uploaded PDF count
    const sudahUploadRes = db.prepare(`
      SELECT count(*) as count FROM upload_pdf 
      WHERE tahun = ? AND bulan = ?
    `).get(targetTahun, bulan) as any;
    const sudahUploadCount = sudahUploadRes.count;
    const belumUploadCount = Math.max(0, totalKua - sudahUploadCount);

    // List of KUAs that have NOT uploaded PDF
    const belumUploadKuas = db.prepare(`
      SELECT id_kua, nama_kua FROM kua 
      WHERE aktif = 1 AND id_kua NOT IN (
        SELECT DISTINCT id_kua FROM upload_pdf WHERE tahun = ? AND bulan = ?
      )
    `).all(targetTahun, bulan) as any[];

    // Missing upload details for KUA
    const unresolvedBelumUpload: any[] = [];
    listKuaUninputDetail.forEach(k => {
      const uploadMonths = db.prepare(`
        SELECT DISTINCT bulan FROM upload_pdf WHERE id_kua = ? AND tahun = ?
      `).all(k.id_kua, targetTahun).map((r: any) => r.bulan);

      const missing = testMonths.filter(m => !uploadMonths.includes(m));
      const selectedMonthIndex = testMonths.indexOf(bulan);
      const missingUpToNow = missing.filter(m => testMonths.indexOf(m) <= selectedMonthIndex);

      if (missingUpToNow.length > 0) {
        unresolvedBelumUpload.push({
          nama_kua: k.nama_kua,
          missingMonths: missingUpToNow
        });
      }
    });

    // 4. Monthly volume charts (Sum of Masuk, Keluar, Rusak across all active KUAs grouped by month)
    // We want the monthly trend of 2026 for:
    // - Masuk (Jenis: 'Masuk')
    // - Keluar (Jenis: 'Keluar')
    // - Rusak (Jenis: 'Rusak')
    const monthlyTrend = db.prepare(`
      SELECT bulan, jenis, SUM(jumlah) as total 
      FROM laporan_stok
      WHERE tahun = ?
      GROUP BY bulan, jenis
    `).all(targetTahun) as any[];

    // Structure the data nicely for Chart.js or Recharts
    const chartData = testMonths.map(m => {
      const jMasuk = monthlyTrend.find(r => r.bulan === m && r.jenis === "Masuk")?.total || 0;
      const jKeluar = monthlyTrend.find(r => r.bulan === m && r.jenis === "Keluar")?.total || 0;
      const jRusak = monthlyTrend.find(r => r.bulan === m && r.jenis === "Rusak")?.total || 0;
      return {
        name: m,
        Masuk: jMasuk,
        Keluar: jKeluar,
        Rusak: jRusak
      };
    });

    // 5. Monthly trend of subjenis (NB, N, NA) for the selected month
    const subjenisData = db.prepare(`
      SELECT subjenis, jenis, SUM(jumlah) as total 
      FROM laporan_stok
      WHERE tahun = ? AND bulan = ?
      GROUP BY subjenis, jenis
    `).all(targetTahun, bulan) as any[];

    // 6. Monthly report completeness progress
    const monthlyInputs = db.prepare(`
      SELECT bulan, COUNT(DISTINCT id_kua) as count 
      FROM laporan_stok
      WHERE tahun = ?
      GROUP BY bulan
    `).all(targetTahun) as any[];

    const monthlyCompleteness = testMonths.map(m => {
      const match = monthlyInputs.find(r => r.bulan === m);
      const count = match ? match.count : 0;
      const percentage = totalKua > 0 ? Math.round((count / totalKua) * 100) : 0;
      return {
        month: m,
        count,
        percentage
      };
    });

    return res.json({
      totalKua,
      sudahInputCount,
      belumInputCount,
      sudahUploadCount,
      belumUploadCount,
      belumInputKuas,
      belumUploadKuas,
      unresolvedUninput,
      unresolvedBelumUpload,
      chartData,
      subjenisData,
      monthlyCompleteness
    });
  } catch (err: any) {
    console.error("Dashboard calculation error:", err);
    return res.status(500).json({ message: "Gagal menghitung statistik dashboard." });
  }
});


// 7. Activity Logs Audit Trail (Admin Only)
app.get("/api/logs", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses ditolak." });
  }

  try {
    const logs = db.prepare("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 500").all();
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal memuat log aktivitas." });
  }
});


// 8. Database Backup & Restore (Admin Only)
app.get("/api/db/backup", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Hanya Admin yang dapat mengunduh backup." });
  }

  try {
    const backupData: any = {};
    const tables = ["users", "kua", "laporan_stok", "upload_pdf", "activity_logs"];
    
    tables.forEach(t => {
      backupData[t] = db.prepare(`SELECT * FROM ${t}`).all();
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=SIBN_Backup_Database.json");
    return res.json(backupData);
  } catch (err: any) {
    return res.status(500).json({ message: "Gagal mengekspor backup." });
  }
});

app.post("/api/db/restore", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Hanya Admin yang dapat memulihkan backup." });
  }

  const backupData = req.body;
  if (!backupData || typeof backupData !== "object") {
    return res.status(400).json({ message: "Data backup tidak valid." });
  }

  try {
    const tables = ["users", "kua", "laporan_stok", "upload_pdf", "activity_logs"];
    
    // Perform database restore inside a transaction
    const transaction = db.transaction(() => {
      tables.forEach(t => {
        if (backupData[t] && Array.isArray(backupData[t])) {
          // Clear current table
          db.prepare(`DELETE FROM ${t}`).run();
          
          if (backupData[t].length > 0) {
            // Build insert columns dynamic query
            const sample = backupData[t][0];
            const cols = Object.keys(sample);
            const placeholders = cols.map(() => "?").join(", ");
            const insertQuery = db.prepare(`
              INSERT INTO ${t} (${cols.join(", ")})
              VALUES (${placeholders})
            `);

            backupData[t].forEach((row: any) => {
              const vals = cols.map(c => row[c]);
              insertQuery.run(...vals);
            });
          }
        }
      });
    });

    transaction();

    addLog(req.user.id_user, req.user.username, "Restore Database", "Berhasil memulihkan database dari file backup cadangan");
    return res.json({ success: true, message: "Database berhasil dipulihkan dari cadangan!" });
  } catch (err: any) {
    console.error("Restore error:", err);
    return res.status(500).json({ message: "Gagal memulihkan database. Cek format file backup Anda." });
  }
});

// Reset Laporan Stok & Hapus PDF (Admin Only)
app.post("/api/admin/reset-data", authenticate, (req: any, res) => {
  if (req.user.level !== "Admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya Admin yang diizinkan." });
  }

  const { resetLaporan, resetPdf } = req.body;
  if (!resetLaporan && !resetPdf) {
    return res.status(400).json({ message: "Silakan pilih minimal satu opsi reset data." });
  }

  try {
    const transaction = db.transaction(() => {
      if (resetLaporan) {
        db.prepare("DELETE FROM laporan_stok").run();
        addLog(req.user.id_user, req.user.username, "Reset Laporan Stok", "Mereset seluruh data Laporan Persediaan KUA untuk semua kecamatan");
      }

      if (resetPdf) {
        db.prepare("DELETE FROM upload_pdf").run();
        
        // Delete PDF files physically from the uploads folder
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          for (const file of files) {
            if (file.toLowerCase().endsWith(".pdf")) {
              const filePath = path.join(uploadsDir, file);
              try {
                fs.unlinkSync(filePath);
              } catch (err) {
                console.error("Gagal menghapus file:", file, err);
              }
            }
          }
        }
        addLog(req.user.id_user, req.user.username, "Hapus Semua PDF", "Menghapus seluruh berkas PDF laporan terunggah untuk semua kecamatan");
      }
    });

    transaction();

    return res.json({ 
      success: true, 
      message: `Berhasil mereset data: ${resetLaporan ? "Laporan Persediaan" : ""} ${resetLaporan && resetPdf ? "dan" : ""} ${resetPdf ? "Berkas PDF Terunggah" : ""} untuk semua kecamatan!` 
    });
  } catch (err: any) {
    console.error("Reset data error:", err);
    return res.status(500).json({ message: "Gagal memproses penghapusan/reset data." });
  }
});


// ==========================================
// VITE AND STATIC ASSETS SERVING MIDDLEWARE
// ==========================================

// ==========================================
// VITE AND STATIC ASSETS SERVING MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve the uploads folder statically for view/download purposes
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global express error:", err);
    return res.status(500).json({ message: err.message || "Terjadi kesalahan sistem internal." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIBN server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Gagal memulai server SIBN:", err);
});
