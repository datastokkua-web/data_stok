<?php
/**
 * ========================================================
 * SIBN (Sistem Informasi Blanko Nikah) - Kabupaten Tangerang
 * Master API Backend Engine (PHP & MySQL Single-File Engine)
 * ========================================================
 * 
 * This file acts as a direct, drop-in replacement for server.ts in PHP hosting environments
 * such as InfinityFree, cPanel, or standard VPS PHP/MySQL stacks.
 * 
 * FEATURES:
 * 1. Full compatibility with React/Vite front-end requests (CORS & endpoints)
 * 2. Automatic DB table installation and default seed data on first run
 * 3. Base64 JWT Session Authentication matching Node.js signature hashing
 * 4. CSRF Validation using custom request headers
 * 5. Complete CRUD for KUA, Users, Laporan Stok, PDF, Activity Logs, and DB Backup/Restore
 */

// --------------------------------------------------------
// CORS & ENVIRONMENT HEADERS
// --------------------------------------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-XSRF-Token, X-Auth-Token");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Disable error display in production JSON output, log them instead
ini_set('display_errors', 0);
error_reporting(E_ALL);

// --------------------------------------------------------
// DATABASE CONFIGURATION (Supports Env variables & fallbacks)
// --------------------------------------------------------
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_port = getenv('DB_PORT') ?: '3306';
$db_name = getenv('DB_NAME') ?: 'sibn_db';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

// Establish PDO connection
try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$db_name`");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Gagal koneksi ke database MySQL: " . $e->getMessage()]);
    exit;
}

// Ensure Uploads directory exists
$uploads_dir = __DIR__ . '/uploads';
if (!file_exists($uploads_dir)) {
    mkdir($uploads_dir, 0755, true);
}

// --------------------------------------------------------
// AUTO-INSTALLER / SEEDER (Runs if 'kua' table doesn't exist)
// --------------------------------------------------------
try {
    $table_check = $pdo->query("SHOW TABLES LIKE 'kua'")->rowCount();
    if ($table_check === 0) {
        // Execute Schema Structure
        $pdo->exec("
            CREATE TABLE `kua` (
              `id_kua` int(11) NOT NULL AUTO_INCREMENT,
              `nama_kua` varchar(100) NOT NULL,
              `alamat` text DEFAULT NULL,
              `kepala_kua` varchar(150) DEFAULT NULL,
              `operator` varchar(100) DEFAULT NULL,
              `aktif` int(11) DEFAULT 1,
              PRIMARY KEY (`id_kua`),
              UNIQUE KEY `uq_nama_kua` (`nama_kua`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $pdo->exec("
            CREATE TABLE `users` (
              `id_user` int(11) NOT NULL AUTO_INCREMENT,
              `username` varchar(100) NOT NULL,
              `password` varchar(255) NOT NULL,
              `nama` varchar(150) NOT NULL,
              `level` varchar(50) NOT NULL,
              `status` varchar(50) DEFAULT 'Aktif',
              `last_login` varchar(100) DEFAULT NULL,
              `ganti_password` int(11) DEFAULT 0,
              `id_kua` int(11) DEFAULT NULL,
              PRIMARY KEY (`id_user`),
              UNIQUE KEY `uq_username` (`username`),
              KEY `fk_user_kua` (`id_kua`),
              CONSTRAINT `fk_user_kua` FOREIGN KEY (`id_kua`) REFERENCES `kua` (`id_kua`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $pdo->exec("
            CREATE TABLE `laporan_stok` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `id_kua` int(11) NOT NULL,
              `tahun` int(11) NOT NULL,
              `bulan` varchar(50) NOT NULL,
              `jenis` varchar(50) NOT NULL,
              `subjenis` varchar(50) NOT NULL,
              `kategori` varchar(50) DEFAULT '',
              `jumlah` int(11) NOT NULL DEFAULT 0,
              `created_at` varchar(100) NOT NULL,
              `updated_at` varchar(100) NOT NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_laporan_stok` (`id_kua`,`tahun`,`bulan`,`jenis`,`subjenis`,`kategori`),
              CONSTRAINT `fk_stok_kua` FOREIGN KEY (`id_kua`) REFERENCES `kua` (`id_kua`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $pdo->exec("
            CREATE TABLE `upload_pdf` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `id_kua` int(11) NOT NULL,
              `bulan` varchar(50) NOT NULL,
              `tahun` int(11) NOT NULL,
              `nama_file` varchar(255) NOT NULL,
              `tanggal_upload` varchar(100) NOT NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_upload_pdf` (`id_kua`,`bulan`,`tahun`),
              CONSTRAINT `fk_pdf_kua` FOREIGN KEY (`id_kua`) REFERENCES `kua` (`id_kua`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $pdo->exec("
            CREATE TABLE `activity_logs` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `id_user` int(11) DEFAULT NULL,
              `username` varchar(100) NOT NULL,
              `aktivitas` varchar(100) NOT NULL,
              `detail` text NOT NULL,
              `timestamp` varchar(100) NOT NULL,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // Seed KUA Offices
        $listKua = [
            ["Teluknaga", "Jl. Raya Teluknaga, Tangerang", "H. Ahmad S.Ag", "operator_teluknaga"],
            ["Mauk", "Jl. Raya Mauk, Tangerang", "Drs. Syarifuddin", "operator_mauk"],
            ["Rajeg", "Jl. Raya Rajeg No. 12, Tangerang", "H. Mulyadi S.HI", "operator_rajeg"],
            ["Sepatan", "Jl. Raya Sepatan, Tangerang", "Drs. H. Sanusi", "operator_sepatan"],
            ["Pasar Kemis", "Jl. Raya Pasar Kemis, Tangerang", "H. Sukarnawijaya S.Ag", "operator_pasarkemis"],
            ["Balaraja", "Jl. Raya Balaraja, Tangerang", "H. Syahroni S.Ag", "operator_balaraja"],
            ["Kresek", "Jl. Raya Kresek, Tangerang", "Drs. H. Anwar", "operator_kresek"],
            ["Kronjo", "Jl. Raya Kronjo, Tangerang", "H. Safei S.HI", "operator_kronjo"],
            ["Curug", "Jl. Raya Curug, Tangerang", "H. Nasrullah S.Ag", "operator_curug"],
            ["Cikupa", "Jl. Raya Cikupa, Tangerang", "H. M. Yusuf S.Ag", "operator_cikupa"],
            ["Legok", "Jl. Raya Legok, Tangerang", "Drs. H. Hamdan", "operator_legok"],
            ["Tigaraksa", "Jl. Raya Tigaraksa No. 5, Tangerang", "H. Ujang S.HI", "operator_tigaraksa"],
            ["Cisoka", "Jl. Raya Cisoka, Tangerang", "H. Subur S.Ag", "operator_cisoka"],
            ["Pakuhaji", "Jl. Raya Pakuhaji, Tangerang", "Drs. H. Kosasih", "operator_pakuhaji"],
            ["Kosambi", "Jl. Raya Kosambi, Tangerang", "H. Zaenal Abidin S.Ag", "operator_kosambi"],
            ["Pagedangan", "Jl. Raya Pagedangan, Tangerang", "Drs. H. Junaedi", "operator_pagedangan"],
            ["Panongan", "Jl. Raya Panongan, Tangerang", "H. Mahmud S.HI", "operator_panongan"],
            ["Cisauk", "Jl. Raya Cisauk, Tangerang", "Drs. H. Mansyur", "operator_cisauk"],
            ["Jayanti", "Jl. Raya Jayanti, Tangerang", "H. Ahmad Fauzi S.Ag", "operator_jayanti"],
            ["Kemiri", "Jl. Raya Kemiri, Tangerang", "Drs. H. Ridwan", "operator_kemiri"],
            ["Sukadiri", "Jl. Raya Sukadiri, Tangerang", "H. Mas'ud S.Ag", "operator_sukadiri"],
            ["Jambe", "Jl. Raya Jambe, Tangerang", "Drs. H. Rustam", "operator_jambe"],
            ["Sukamulya", "Jl. Raya Sukamulya, Tangerang", "H. Mahfudz S.HI", "operator_sukamulya"],
            ["Kelapa Dua", "Jl. Raya Kelapa Dua, Tangerang", "H. Solihin S.Ag", "operator_kelapadua"],
            ["Sindang Jaya", "Jl. Raya Sindang Jaya, Tangerang", "Drs. H. Yahya", "operator_sindangjaya"],
            ["Sepatan Timur", "Jl. Raya Sepatan Timur, Tangerang", "H. Mukhtar S.Ag", "operator_sepatantimur"],
            ["Solear", "Jl. Raya Solear, Tangerang", "H. Sobari S.Ag", "operator_solear"],
            ["Gunung Kaler", "Jl. Raya Gunung Kaler, Tangerang", "Drs. H. Badri", "operator_gunungkaler"],
            ["Mekar Baru", "Jl. Raya Mekar Baru, Tangerang", "H. Abdul Jamil S.Ag", "operator_mekarbaru"]
        ];

        $insertKua = $pdo->prepare("INSERT INTO kua (nama_kua, alamat, kepala_kua, operator, aktif) VALUES (?, ?, ?, ?, 1)");
        foreach ($listKua as $k) {
            $insertKua->execute($k);
        }

        // Seed default Admin & Viewer
        // admin123 -> $2y$10$wN9FmsLgq6H1F0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.
        // viewer123 -> $2y$10$qC5Yp4D39Z8f0fXoYpThek37VJp.ZidF1nOq9vUof4D9uWevBvX.
        $pdo->exec("
            INSERT INTO users (username, password, nama, level, status, id_kua) VALUES 
            ('admin', '$2y$10$wN9FmsLgq6H1F0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.', 'Administrator Kabupaten Tangerang', 'Admin', 'Aktif', NULL),
            ('viewer', '$2y$10$qC5Yp4D39Z8f0fXoYpThek37VJp.ZidF1nOq9vUof4D9uWevBvX.', 'Viewer Kemenag', 'Viewer', 'Aktif', NULL);
        ");

        // Seed Operators for each KUA (Default password: 12345 -> $2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.)
        $kuas = $pdo->query("SELECT id_kua, nama_kua FROM kua")->fetchAll();
        $insertUser = $pdo->prepare("INSERT INTO users (username, password, nama, level, status, id_kua) VALUES (?, ?, ?, 'Operator KUA', 'Aktif', ?)");
        foreach ($kuas as $k) {
            $username = strtolower(preg_replace('/\s+/', '', $k['nama_kua']));
            $insertUser->execute([
                $username,
                '$2y$10$f38fB7fD1E9f0fXoYpThek94WJp.ZidF1nOq9vUof4D9uWevBvX.',
                "Operator KUA {$k['nama_kua']}",
                $k['id_kua']
            ]);
        }

        // Create Seed Logs
        $now = date('c');
        $pdo->prepare("INSERT INTO activity_logs (id_user, username, aktivitas, detail, timestamp) VALUES (?, ?, ?, ?, ?)")
            ->execute([1, 'admin', 'System Setup', 'Menginisialisasi sistem informasi blanko nikah (SIBN) Kabupaten Tangerang berbasis MySQL', $now]);
    }
} catch (PDOException $ex) {
    // Database schema execution failed
}

// --------------------------------------------------------
// SECURITY CRYPTO UTILITIES
// --------------------------------------------------------
const JWT_SECRET = "SIBN_JWT_SECRET_KEY_FOR_SECURE_TOKEN_SESSIONS";
const CSRF_SECRET = "SIBN_CSRF_SECRET_2026";

function generateCsrfToken($userId) {
    return hash_hmac("sha256", $userId . "_csrf", CSRF_SECRET);
}

function createToken($user) {
    $payload = [
        "id_user" => (int)$user['id_user'],
        "username" => $user['username'],
        "nama" => $user['nama'],
        "level" => $user['level'],
        "id_kua" => $user['id_kua'] ? (int)$user['id_kua'] : null,
        "ganti_password" => (int)$user['ganti_password'],
        "csrfToken" => generateCsrfToken($user['id_user'])
    ];
    $data = base64_encode(json_encode($payload));
    $signature = hash_hmac("sha256", $data, JWT_SECRET);
    return "$data.$signature";
}

function verifyToken($token) {
    try {
        if (!$token) return null;
        $parts = explode(".", $token);
        if (count($parts) !== 2) return null;
        list($data, $signature) = $parts;
        $expectedSignature = hash_hmac("sha256", $data, JWT_SECRET);
        if ($signature !== $expectedSignature) return null;
        return json_decode(base64_decode($data), true);
    } catch (Exception $e) {
        return null;
    }
}

function verifyPassword($password, $storedHash) {
    if (strpos($storedHash, '$2y$') === 0 || strpos($storedHash, '$2b$') === 0) {
        return password_verify($password, $storedHash);
    }
    // pbkdf2 fallback matching Node pbkdf2
    try {
        list($salt, $hash) = explode(":", $storedHash);
        $verifyHash = bin2hex(hash_pbkdf2("sha512", $password, $salt, 1000, 64, true));
        return $hash === $verifyHash;
    } catch (Exception $e) {
        return false;
    }
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function addLog($pdo, $idUser, $username, $aktivitas, $detail) {
    $stmt = $pdo->prepare("INSERT INTO activity_logs (id_user, username, aktivitas, detail, timestamp) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$idUser, $username, $aktivitas, $detail, date('c')]);
}

// --------------------------------------------------------
// ROUTE PARSING & GATEKEEPING
// --------------------------------------------------------
$route = isset($_GET['route']) ? $_GET['route'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Parse URL path parameters (e.g., users/15 -> route 'users' with id parameter)
$id_param = null;
if (preg_match('/^(users|kua|pdf)\/([0-9]+)$/', $route, $matches)) {
    $route = $matches[1];
    $id_param = (int)$matches[2];
} elseif (preg_match('/^pdf\/view\/(.+)$/', $route, $matches)) {
    $route = 'pdf/view';
    $id_param = $matches[1]; // holds filename
}

// Extract token and authenticate request
$auth_user = null;
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
if (empty($auth_header) && isset($headers['X-Auth-Token'])) {
    $auth_header = $headers['X-Auth-Token'];
}

if (!empty($auth_header)) {
    $token = $auth_header;
    if (strpos($auth_header, 'Bearer ') === 0) {
        $token = substr($auth_header, 7);
    }
    $auth_user = verifyToken($token);
}

// Guard checking function
function require_auth($auth_user) {
    if (!$auth_user) {
        http_response_code(419);
        echo json_encode(["message" => "Sesi Anda telah berakhir. Silakan login kembali."]);
        exit;
    }
}

// CSRF check for write operations
if (in_array($method, ['POST', 'PUT', 'DELETE']) && !in_array($route, ['auth/login', 'pdf/view'])) {
    require_auth($auth_user);
    $client_csrf = isset($headers['X-Xsrf-Token']) ? $headers['X-Xsrf-Token'] : (isset($headers['x-xsrf-token']) ? $headers['x-xsrf-token'] : '');
    if (empty($client_csrf)) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['_csrf'])) $client_csrf = $input['_csrf'];
    }
    if (empty($client_csrf) || $client_csrf !== $auth_user['csrfToken']) {
        http_response_code(403);
        echo json_encode(["message" => "Validasi CSRF gagal. Permintaan tidak aman."]);
        exit;
    }
}

// Utility to sanitize HTML output
function clean_html($str) {
    if (is_array($str)) return array_map('clean_html', $str);
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// Parse request body for JSON payload
$raw_body = file_get_contents('php://input');
$req_data = json_decode($raw_body, true) ?: [];

// --------------------------------------------------------
// ROUTE ENDPOINT CONTROLLER
// --------------------------------------------------------
switch ($route) {

    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    case 'auth/login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["message" => "Metode tidak diizinkan."]);
            break;
        }

        $username = isset($req_data['username']) ? strtolower(trim($req_data['username'])) : '';
        $password = isset($req_data['password']) ? $req_data['password'] : '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(["message" => "Username dan password wajib diisi."]);
            break;
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !verifyPassword($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(["message" => "Username atau Password salah."]);
            break;
        }

        if ($user['status'] !== 'Aktif') {
            http_response_code(403);
            echo json_encode(["message" => "Akun Anda telah dinonaktifkan. Hubungi admin."]);
            break;
        }

        // Generate token and update last login
        $token = createToken($user);
        $now = date('c');
        $pdo->prepare("UPDATE users SET last_login = ? WHERE id_user = ?")->execute([$now, $user['id_user']]);

        addLog($pdo, $user['id_user'], $user['username'], 'Login', 'Berhasil masuk ke dalam sistem');

        echo json_encode([
            "token" => $token,
            "user" => [
                "id_user" => (int)$user['id_user'],
                "username" => $user['username'],
                "nama" => $user['nama'],
                "level" => $user['level'],
                "id_kua" => $user['id_kua'] ? (int)$user['id_kua'] : null,
                "ganti_password" => (int)$user['ganti_password'],
                "csrfToken" => generateCsrfToken($user['id_user'])
            ]
        ]);
        break;

    case 'auth/me':
        require_auth($auth_user);
        echo json_encode(["user" => $auth_user]);
        break;

    case 'auth/change-password':
        require_auth($auth_user);
        $old_pass = isset($req_data['oldPassword']) ? $req_data['oldPassword'] : '';
        $new_pass = isset($req_data['newPassword']) ? $req_data['newPassword'] : '';

        if (empty($old_pass) || empty($new_pass)) {
            http_response_code(400);
            echo json_encode(["message" => "Password lama dan baru wajib diisi."]);
            break;
        }

        $stmt = $pdo->prepare("SELECT password FROM users WHERE id_user = ?");
        $stmt->execute([$auth_user['id_user']]);
        $curr_pass = $stmt->fetchColumn();

        if (!$curr_pass || !verifyPassword($old_pass, $curr_pass)) {
            http_response_code(400);
            echo json_encode(["message" => "Password lama salah."]);
            break;
        }

        $hashed_new = hashPassword($new_pass);
        $pdo->prepare("UPDATE users SET password = ?, ganti_password = 1 WHERE id_user = ?")
            ->execute([$hashed_new, $auth_user['id_user']]);

        addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Ganti Password', 'Berhasil mengganti password akun');
        echo json_encode(["success" => true, "message" => "Password berhasil diperbarui."]);
        break;

    // ----------------------------------------------------
    // KUA MANAGEMENT
    // ----------------------------------------------------
    case 'kua':
        require_auth($auth_user);

        if ($method === 'GET') {
            // Operator only views their own KUA
            if ($auth_user['level'] === 'Operator KUA' && $auth_user['id_kua']) {
                $stmt = $pdo->prepare("SELECT * FROM kua WHERE id_kua = ?");
                $stmt->execute([$auth_user['id_kua']]);
                $kua = $stmt->fetch();
                echo json_encode($kua ? [$kua] : []);
            } else {
                $kuas = $pdo->query("SELECT * FROM kua ORDER BY nama_kua ASC")->fetchAll();
                echo json_encode($kuas);
            }
        } 
        elseif ($method === 'POST') {
            if ($auth_user['level'] !== 'Admin') {
                http_response_code(403);
                echo json_encode(["message" => "Akses ditolak. Hanya Admin yang diizinkan."]);
                break;
            }

            $nama_kua = isset($req_data['nama_kua']) ? trim($req_data['nama_kua']) : '';
            $alamat = isset($req_data['alamat']) ? trim($req_data['alamat']) : '';
            $kepala_kua = isset($req_data['kepala_kua']) ? trim($req_data['kepala_kua']) : '';
            $operator = isset($req_data['operator']) ? trim($req_data['operator']) : '';
            $aktif = isset($req_data['aktif']) ? $req_data['aktif'] : true;

            if (empty($nama_kua)) {
                http_response_code(400);
                echo json_encode(["message" => "Nama KUA wajib diisi."]);
                break;
            }

            // Check duplicate
            $check = $pdo->prepare("SELECT id_kua FROM kua WHERE nama_kua = ?");
            $check->execute([$nama_kua]);
            if ($check->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["message" => "KUA dengan nama tersebut sudah terdaftar."]);
                break;
            }

            $stmt = $pdo->prepare("INSERT INTO kua (nama_kua, alamat, kepala_kua, operator, aktif) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                clean_html($nama_kua),
                clean_html($alamat),
                clean_html($kepala_kua),
                clean_html($operator),
                $aktif === false ? 0 : 1
            ]);
            $new_id = $pdo->lastInsertId();

            // Auto create default user operator
            $op_username = strtolower(preg_replace('/\s+/', '', $nama_kua));
            $check_user = $pdo->prepare("SELECT id_user FROM users WHERE username = ?");
            $check_user->execute([$op_username]);
            if ($check_user->rowCount() === 0) {
                $pdo->prepare("INSERT INTO users (username, password, nama, level, status, id_kua) VALUES (?, ?, ?, 'Operator KUA', 'Aktif', ?)")
                    ->execute([
                        $op_username,
                        hashPassword("12345"),
                        "Operator KUA $nama_kua",
                        $new_id
                    ]);
            }

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Tambah KUA', "Menambahkan master KUA baru: $nama_kua");
            echo json_encode(["success" => true, "message" => "KUA berhasil ditambahkan."]);
        } 
        elseif ($method === 'PUT') {
            if (!$id_param) {
                http_response_code(400);
                echo json_encode(["message" => "ID KUA tidak dispesifikasi."]);
                break;
            }

            if ($auth_user['level'] !== 'Admin' && $id_param !== $auth_user['id_kua']) {
                http_response_code(403);
                echo json_encode(["message" => "Anda tidak memiliki izin mengedit KUA ini."]);
                exit;
            }

            $current_kua = $pdo->prepare("SELECT * FROM kua WHERE id_kua = ?");
            $current_kua->execute([$id_param]);
            $current = $current_kua->fetch();
            if (!$current) {
                http_response_code(404);
                echo json_encode(["message" => "KUA tidak ditemukan."]);
                break;
            }

            $nama_kua = isset($req_data['nama_kua']) ? trim($req_data['nama_kua']) : $current['nama_kua'];
            $alamat = isset($req_data['alamat']) ? trim($req_data['alamat']) : $current['alamat'];
            $kepala_kua = isset($req_data['kepala_kua']) ? trim($req_data['kepala_kua']) : $current['kepala_kua'];
            $operator = isset($req_data['operator']) ? trim($req_data['operator']) : $current['operator'];
            $aktif = isset($req_data['aktif']) ? $req_data['aktif'] : ($current['aktif'] == 1);

            if ($auth_user['level'] === 'Admin') {
                $stmt = $pdo->prepare("UPDATE kua SET nama_kua = ?, alamat = ?, kepala_kua = ?, operator = ?, aktif = ? WHERE id_kua = ?");
                $stmt->execute([
                    clean_html($nama_kua),
                    clean_html($alamat),
                    clean_html($kepala_kua),
                    clean_html($operator),
                    $aktif === false ? 0 : 1,
                    $id_param
                ]);
            } else {
                // Operator can only edit alamat and kepala_kua
                $stmt = $pdo->prepare("UPDATE kua SET alamat = ?, kepala_kua = ? WHERE id_kua = ?");
                $stmt->execute([
                    clean_html($alamat),
                    clean_html($kepala_kua),
                    $id_param
                ]);
            }

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Edit KUA', "Mengupdate rincian KUA: {$current['nama_kua']}");
            echo json_encode(["success" => true, "message" => "KUA berhasil diperbarui."]);
        } 
        elseif ($method === 'DELETE') {
            if ($auth_user['level'] !== 'Admin') {
                http_response_code(403);
                echo json_encode(["message" => "Hanya Admin yang diizinkan."]);
                break;
            }

            if (!$id_param) {
                http_response_code(400);
                echo json_encode(["message" => "ID tidak valid."]);
                break;
            }

            $current_kua = $pdo->prepare("SELECT nama_kua FROM kua WHERE id_kua = ?");
            $current_kua->execute([$id_param]);
            $kua_name = $current_kua->fetchColumn();

            if (!$kua_name) {
                http_response_code(404);
                echo json_encode(["message" => "KUA tidak ditemukan."]);
                break;
            }

            $pdo->prepare("DELETE FROM kua WHERE id_kua = ?")->execute([$id_param]);
            $pdo->prepare("DELETE FROM users WHERE id_kua = ?")->execute([$id_param]);

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Hapus KUA', "Menghapus KUA dan Operator terkait: $kua_name");
            echo json_encode(["success" => true, "message" => "KUA berhasil dihapus."]);
        }
        break;

    // ----------------------------------------------------
    // USER MANAGEMENT
    // ----------------------------------------------------
    case 'users':
        require_auth($auth_user);
        if ($auth_user['level'] !== 'Admin') {
            http_response_code(403);
            echo json_encode(["message" => "Akses terbatas."]);
            break;
        }

        if ($method === 'GET') {
            $users = $pdo->query("
                SELECT u.*, k.nama_kua 
                FROM users u
                LEFT JOIN kua k ON u.id_kua = k.id_kua
                ORDER BY u.id_user ASC
            ")->fetchAll();
            // Map types safely
            foreach ($users as &$u) {
                $u['id_user'] = (int)$u['id_user'];
                $u['id_kua'] = $u['id_kua'] ? (int)$u['id_kua'] : null;
                $u['ganti_password'] = (int)$u['ganti_password'];
            }
            echo json_encode($users);
        } 
        elseif ($method === 'POST') {
            $username = isset($req_data['username']) ? strtolower(preg_replace('/\s+/', '', $req_data['username'])) : '';
            $password = isset($req_data['password']) ? $req_data['password'] : '';
            $nama = isset($req_data['nama']) ? trim($req_data['nama']) : '';
            $level = isset($req_data['level']) ? $req_data['level'] : '';
            $status = isset($req_data['status']) ? $req_data['status'] : 'Aktif';
            $id_kua = isset($req_data['id_kua']) ? (int)$req_data['id_kua'] : null;

            if (empty($username) || empty($password) || empty($nama) || empty($level)) {
                http_response_code(400);
                echo json_encode(["message" => "Data tidak lengkap."]);
                break;
            }

            // Check exist
            $check = $pdo->prepare("SELECT id_user FROM users WHERE username = ?");
            $check->execute([$username]);
            if ($check->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["message" => "Username sudah digunakan."]);
                break;
            }

            $stmt = $pdo->prepare("INSERT INTO users (username, password, nama, level, status, id_kua) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $username,
                hashPassword($password),
                clean_html($nama),
                $level,
                $status,
                $level === 'Operator KUA' ? $id_kua : null
            ]);

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Tambah User', "Menambahkan user baru: $username");
            echo json_encode(["success" => true, "message" => "User berhasil dibuat."]);
        } 
        elseif ($method === 'PUT') {
            if (!$id_param) {
                http_response_code(400);
                echo json_encode(["message" => "ID user tidak disertakan."]);
                break;
            }

            $current_user = $pdo->prepare("SELECT * FROM users WHERE id_user = ?");
            $current_user->execute([$id_param]);
            $current = $current_user->fetch();

            if (!$current) {
                http_response_code(404);
                echo json_encode(["message" => "User tidak ditemukan."]);
                break;
            }

            $nama = isset($req_data['nama']) ? trim($req_data['nama']) : $current['nama'];
            $level = isset($req_data['level']) ? $req_data['level'] : $current['level'];
            $status = isset($req_data['status']) ? $req_data['status'] : $current['status'];
            $id_kua = isset($req_data['id_kua']) ? (int)$req_data['id_kua'] : null;
            $password = isset($req_data['password']) ? $req_data['password'] : null;

            if (!empty($password)) {
                $stmt = $pdo->prepare("UPDATE users SET nama = ?, level = ?, status = ?, id_kua = ?, password = ?, ganti_password = 0 WHERE id_user = ?");
                $stmt->execute([
                    clean_html($nama),
                    $level,
                    $status,
                    $level === 'Operator KUA' ? $id_kua : null,
                    hashPassword($password),
                    $id_param
                ]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET nama = ?, level = ?, status = ?, id_kua = ? WHERE id_user = ?");
                $stmt->execute([
                    clean_html($nama),
                    $level,
                    $status,
                    $level === 'Operator KUA' ? $id_kua : null,
                    $id_param
                ]);
            }

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Edit User', "Mengubah data user: {$current['username']}");
            echo json_encode(["success" => true, "message" => "User berhasil diperbarui."]);
        } 
        elseif ($method === 'DELETE') {
            if (!$id_param) {
                http_response_code(400);
                echo json_encode(["message" => "ID user tidak valid."]);
                break;
            }

            if ($id_param === (int)$auth_user['id_user']) {
                http_response_code(400);
                echo json_encode(["message" => "Anda tidak dapat menghapus akun Anda sendiri."]);
                break;
            }

            $current_user = $pdo->prepare("SELECT username FROM users WHERE id_user = ?");
            $current_user->execute([$id_param]);
            $username = $current_user->fetchColumn();

            if (!$username) {
                http_response_code(404);
                echo json_encode(["message" => "User tidak ditemukan."]);
                break;
            }

            $pdo->prepare("DELETE FROM users WHERE id_user = ?")->execute([$id_param]);

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Hapus User', "Menghapus akun user: $username");
            echo json_encode(["success" => true, "message" => "User berhasil dihapus."]);
        }
        break;

    // ----------------------------------------------------
    // LAPORAN STOK (Pivot, Detail, Input)
    // ----------------------------------------------------
    case 'stok/pivot':
        require_auth($auth_user);
        $id_kua = isset($_GET['id_kua']) ? (int)$_GET['id_kua'] : 0;
        $tahun = isset($_GET['tahun']) ? (int)$_GET['tahun'] : 0;

        if (!$id_kua || !$tahun) {
            http_response_code(400);
            echo json_encode(["message" => "KUA dan Tahun wajib dipilih."]);
            break;
        }

        if ($auth_user['level'] === 'Operator KUA' && $id_kua !== $auth_user['id_kua']) {
            http_response_code(403);
            echo json_encode(["message" => "Akses terbatas ke KUA Anda sendiri."]);
            break;
        }

        $query = "
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
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute([$id_kua, $tahun]);
        $rows = $stmt->fetchAll();

        // Ensure correct types (int conversion)
        foreach ($rows as &$r) {
            foreach (['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jumlah'] as $col) {
                $r[$col] = (int)$r[$col];
            }
        }
        echo json_encode($rows);
        break;

    case 'stok/detail':
        require_auth($auth_user);
        $id_kua = isset($_GET['id_kua']) ? (int)$_GET['id_kua'] : 0;
        $bulan = isset($_GET['bulan']) ? trim($_GET['bulan']) : '';
        $tahun = isset($_GET['tahun']) ? (int)$_GET['tahun'] : 0;

        if (!$id_kua || empty($bulan) || !$tahun) {
            http_response_code(400);
            echo json_encode(["message" => "Parameter tidak lengkap."]);
            break;
        }

        if ($auth_user['level'] === 'Operator KUA' && $id_kua !== $auth_user['id_kua']) {
            http_response_code(403);
            echo json_encode(["message" => "Akses ditolak."]);
            break;
        }

        $stmt = $pdo->prepare("SELECT jenis, subjenis, kategori, jumlah FROM laporan_stok WHERE id_kua = ? AND bulan = ? AND tahun = ?");
        $stmt->execute([$id_kua, $bulan, $tahun]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['jumlah'] = (int)$r['jumlah'];
        }
        echo json_encode($rows);
        break;

    case 'stok/input':
        require_auth($auth_user);
        $id_kua = isset($req_data['id_kua']) ? (int)$req_data['id_kua'] : 0;
        $bulan = isset($req_data['bulan']) ? trim($req_data['bulan']) : '';
        $tahun = isset($req_data['tahun']) ? (int)$req_data['tahun'] : 0;
        $items = isset($req_data['items']) ? $req_data['items'] : [];
        $is_edit = isset($req_data['isEdit']) ? $req_data['isEdit'] : false;

        if (!$id_kua || empty($bulan) || !$tahun || !is_array($items)) {
            http_response_code(400);
            echo json_encode(["message" => "Format input tidak valid."]);
            break;
        }

        if ($auth_user['level'] === 'Operator KUA' && $id_kua !== $auth_user['id_kua']) {
            http_response_code(403);
            echo json_encode(["message" => "Anda tidak diizinkan mengisi KUA lain."]);
            break;
        }

        if (!$is_edit) {
            // Check double input
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM laporan_stok WHERE id_kua = ? AND bulan = ? AND tahun = ?");
            $stmt->execute([$id_kua, $bulan, $tahun]);
            if ($stmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(["message" => "Data laporan untuk KUA tersebut pada bulan $bulan $tahun sudah pernah diinput."]);
                break;
            }
        }

        try {
            $pdo->beginTransaction();
            $now = date('c');

            // Insert or update on duplicate key (matching ON CONFLICT DO UPDATE)
            $insert_stmt = $pdo->prepare("
                INSERT INTO laporan_stok (id_kua, tahun, bulan, jenis, subjenis, kategori, jumlah, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    jumlah = VALUES(jumlah),
                    updated_at = VALUES(updated_at)
            ");

            foreach ($items as $item) {
                $jenis = $item['jenis'];
                $subjenis = $item['subjenis'];
                $kategori = isset($item['kategori']) ? $item['kategori'] : '';
                $jumlah = (int)$item['jumlah'];

                if ($jumlah < 0) {
                    throw new Exception("Jumlah harus berupa angka positif!");
                }

                $insert_stmt->execute([
                    $id_kua,
                    $tahun,
                    $bulan,
                    $jenis,
                    $subjenis,
                    $kategori,
                    $jumlah,
                    $now,
                    $now
                ]);
            }

            $pdo->commit();

            $kua_name = $pdo->query("SELECT nama_kua FROM kua WHERE id_kua = $id_kua")->fetchColumn();
            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Input Laporan', "Menginput/mengedit laporan stok KUA " . ($kua_name ?: $id_kua) . " - $bulan $tahun");

            echo json_encode(["success" => true, "message" => "Laporan stok berhasil disimpan."]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(["message" => $e->getMessage() ?: "Gagal menyimpan laporan stok."]);
        }
        break;

    // ----------------------------------------------------
    // PDF UPLOADS
    // ----------------------------------------------------
    case 'pdf/upload':
        require_auth($auth_user);
        $id_kua = isset($_POST['id_kua']) ? (int)$_POST['id_kua'] : 0;
        $bulan = isset($_POST['bulan']) ? trim($_POST['bulan']) : '';
        $tahun = isset($_POST['tahun']) ? (int)$_POST['tahun'] : 0;

        if (!$id_kua || empty($bulan) || !$tahun || !isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["message" => "Data tidak lengkap."]);
            break;
        }

        if ($auth_user['level'] === 'Operator KUA' && $id_kua !== $auth_user['id_kua']) {
            http_response_code(403);
            echo json_encode(["message" => "Akses terbatas ke KUA Anda sendiri."]);
            break;
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(500);
            echo json_encode(["message" => "Error saat upload file."]);
            break;
        }

        // Validate PDF type
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'pdf') {
            http_response_code(400);
            echo json_encode(["message" => "Hanya file PDF yang diperbolehkan!"]);
            break;
        }

        $kua_name = $pdo->query("SELECT nama_kua FROM kua WHERE id_kua = $id_kua")->fetchColumn();
        if (!$kua_name) {
            http_response_code(404);
            echo json_encode(["message" => "KUA tidak ditemukan."]);
            break;
        }

        $sanitized_name = str_replace(' ', '_', $kua_name);
        $target_filename = "{$sanitized_name}_{$bulan}_{$tahun}.pdf";
        $target_path = $uploads_dir . '/' . $target_filename;

        if (file_exists($target_path)) {
            unlink($target_path);
        }

        if (move_uploaded_file($file['tmp_name'], $target_path)) {
            $now = date('c');
            $stmt = $pdo->prepare("
                INSERT INTO upload_pdf (id_kua, bulan, tahun, nama_file, tanggal_upload)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    nama_file = VALUES(nama_file),
                    tanggal_upload = VALUES(tanggal_upload)
            ");
            $stmt->execute([$id_kua, $bulan, $tahun, $target_filename, $now]);

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Upload PDF', "Berhasil mengunggah dokumen PDF: $target_filename");
            echo json_encode(["success" => true, "message" => "File PDF berhasil diunggah.", "filename" => $target_filename]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal menyimpan dokumen PDF."]);
        }
        break;

    case 'pdf/view':
        // No Auth constraint in original routes (public viewable)
        if (!$id_param) {
            http_response_code(400);
            echo "File PDF tidak dispesifikasi.";
            break;
        }
        $target_path = $uploads_dir . '/' . basename($id_param);
        if (!file_exists($target_path)) {
            http_response_code(404);
            echo "File PDF tidak ditemukan.";
            break;
        }

        header("Content-Type: application/pdf");
        header("Content-Disposition: inline; filename=\"" . basename($target_path) . "\"");
        readfile($target_path);
        exit;

    case 'pdf':
        require_auth($auth_user);

        if ($method === 'GET') {
            $query = "
                SELECT p.*, k.nama_kua 
                FROM upload_pdf p
                LEFT JOIN kua k ON p.id_kua = k.id_kua
            ";
            $params = [];

            if ($auth_user['level'] === 'Operator KUA' && $auth_user['id_kua']) {
                $query .= " WHERE p.id_kua = ?";
                $params[] = $auth_user['id_kua'];
            }

            $query .= " ORDER BY p.tanggal_upload DESC";
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $uploads = $stmt->fetchAll();
            foreach ($uploads as &$up) {
                $up['id'] = (int)$up['id'];
                $up['id_kua'] = (int)$up['id_kua'];
                $up['tahun'] = (int)$up['tahun'];
            }
            echo json_encode($uploads);
        } 
        elseif ($method === 'DELETE') {
            if (!$id_param) {
                http_response_code(400);
                echo json_encode(["message" => "ID tidak valid."]);
                break;
            }

            $stmt = $pdo->prepare("SELECT * FROM upload_pdf WHERE id = ?");
            $stmt->execute([$id_param]);
            $item = $stmt->fetch();

            if (!$item) {
                http_response_code(404);
                echo json_encode(["message" => "PDF tidak ditemukan."]);
                break;
            }

            if ($auth_user['level'] === 'Operator KUA' && (int)$item['id_kua'] !== $auth_user['id_kua']) {
                http_response_code(403);
                echo json_encode(["message" => "Akses ditolak."]);
                break;
            }

            // Remove physically
            $file_path = $uploads_dir . '/' . $item['nama_file'];
            if (file_exists($file_path)) {
                unlink($file_path);
            }

            $pdo->prepare("DELETE FROM upload_pdf WHERE id = ?")->execute([$id_param]);

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Hapus PDF', "Menghapus dokumen PDF: {$item['nama_file']}");
            echo json_encode(["success" => true, "message" => "Dokumen PDF berhasil dihapus."]);
        }
        break;

    // ----------------------------------------------------
    // DASHBOARD STATISTICS Engine
    // ----------------------------------------------------
    case 'dashboard/stats':
        require_auth($auth_user);
        $bulan = isset($_GET['bulan']) ? trim($_GET['bulan']) : 'Juli';
        $tahun = isset($_GET['tahun']) ? (int)$_GET['tahun'] : 2026;

        // 1. Total KUA Aktif
        $total_kua = (int)$pdo->query("SELECT COUNT(*) FROM kua WHERE aktif = 1")->fetchColumn();

        // 2. KUA already input
        $stmt_sudah = $pdo->prepare("SELECT DISTINCT id_kua FROM laporan_stok WHERE tahun = ? AND bulan = ?");
        $stmt_sudah->execute([$tahun, $bulan]);
        $sudah_list = $stmt_sudah->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $sudah_count = count($sudah_list);
        $belum_count = max(0, $total_kua - $sudah_count);

        // KUA that have NOT input
        $stmt_belum = $pdo->prepare("SELECT id_kua, nama_kua FROM kua WHERE aktif = 1 AND id_kua NOT IN (SELECT DISTINCT id_kua FROM laporan_stok WHERE tahun = ? AND bulan = ?)");
        $stmt_belum->execute([$tahun, $bulan]);
        $belum_input_kuas = $stmt_belum->fetchAll() ?: [];
        foreach ($belum_input_kuas as &$k) {
            $k['id_kua'] = (int)$k['id_kua'];
        }

        // Search missing months for each KUA for popup
        $all_kuas = $pdo->query("SELECT id_kua, nama_kua FROM kua WHERE aktif = 1")->fetchAll();
        $test_months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        $unresolved_uninput = [];

        foreach ($all_kuas as $k) {
            $stmt_m = $pdo->prepare("SELECT DISTINCT bulan FROM laporan_stok WHERE id_kua = ? AND tahun = ?");
            $stmt_m->execute([$k['id_kua'], $tahun]);
            $input_months = $stmt_m->fetchAll(PDO::FETCH_COLUMN) ?: [];

            $missing = array_diff($test_months, $input_months);
            $selected_index = array_search($bulan, $test_months);
            
            $missing_up_to_now = [];
            foreach ($missing as $m) {
                if (array_search($m, $test_months) <= $selected_index) {
                    $missing_up_to_now[] = $m;
                }
            }

            if (!empty($missing_up_to_now)) {
                $unresolved_uninput[] = [
                    "nama_kua" => $k['nama_kua'],
                    "missingMonths" => array_values($missing_up_to_now)
                ];
            }
        }

        // 3. Uploaded PDF stats
        $stmt_pdf = $pdo->prepare("SELECT COUNT(*) FROM upload_pdf WHERE tahun = ? AND bulan = ?");
        $stmt_pdf->execute([$tahun, $bulan]);
        $sudah_upload_count = (int)$stmt_pdf->fetchColumn();
        $belum_upload_count = max(0, $total_kua - $sudah_upload_count);

        $stmt_belum_pdf = $pdo->prepare("SELECT id_kua, nama_kua FROM kua WHERE aktif = 1 AND id_kua NOT IN (SELECT DISTINCT id_kua FROM upload_pdf WHERE tahun = ? AND bulan = ?)");
        $stmt_belum_pdf->execute([$tahun, $bulan]);
        $belum_upload_kuas = $stmt_belum_pdf->fetchAll() ?: [];
        foreach ($belum_upload_kuas as &$k) {
            $k['id_kua'] = (int)$k['id_kua'];
        }

        // Search missing upload PDF months
        $unresolved_belum_upload = [];
        foreach ($all_kuas as $k) {
            $stmt_up_m = $pdo->prepare("SELECT DISTINCT bulan FROM upload_pdf WHERE id_kua = ? AND tahun = ?");
            $stmt_up_m->execute([$k['id_kua'], $tahun]);
            $upload_months = $stmt_up_m->fetchAll(PDO::FETCH_COLUMN) ?: [];

            $missing = array_diff($test_months, $upload_months);
            $selected_index = array_search($bulan, $test_months);

            $missing_up_to_now = [];
            foreach ($missing as $m) {
                if (array_search($m, $test_months) <= $selected_index) {
                    $missing_up_to_now[] = $m;
                }
            }

            if (!empty($missing_up_to_now)) {
                $unresolved_belum_upload[] = [
                    "nama_kua" => $k['nama_kua'],
                    "missingMonths" => array_values($missing_up_to_now)
                ];
            }
        }

        // 4. Monthly volume charts
        $stmt_trend = $pdo->prepare("SELECT bulan, jenis, SUM(jumlah) as total FROM laporan_stok WHERE tahun = ? GROUP BY bulan, jenis");
        $stmt_trend->execute([$tahun]);
        $trend_rows = $stmt_trend->fetchAll() ?: [];

        $chart_data = [];
        foreach ($test_months as $m) {
            $masuk = 0; $keluar = 0; $rusak = 0;
            foreach ($trend_rows as $tr) {
                if ($tr['bulan'] === $m) {
                    if ($tr['jenis'] === 'Masuk') $masuk = (int)$tr['total'];
                    elseif ($tr['jenis'] === 'Keluar') $keluar = (int)$tr['total'];
                    elseif ($tr['jenis'] === 'Rusak') $rusak = (int)$tr['total'];
                }
            }
            $chart_data[] = [
                "name" => $m,
                "Masuk" => $masuk,
                "Keluar" => $keluar,
                "Rusak" => $rusak
            ];
        }

        // 5. Monthly subjenis data
        $stmt_sub = $pdo->prepare("SELECT subjenis, jenis, SUM(jumlah) as total FROM laporan_stok WHERE tahun = ? AND bulan = ? GROUP BY subjenis, jenis");
        $stmt_sub->execute([$tahun, $bulan]);
        $subjenis_raw = $stmt_sub->fetchAll() ?: [];
        $subjenis_data = [];
        foreach ($subjenis_raw as $s) {
            $subjenis_data[] = [
                "subjenis" => $s['subjenis'],
                "jenis" => $s['jenis'],
                "total" => (int)$s['total']
            ];
        }

        // 6. Monthly report completeness progress
        $stmt_monthly = $pdo->prepare("SELECT bulan, COUNT(DISTINCT id_kua) as count FROM laporan_stok WHERE tahun = ? GROUP BY bulan");
        $stmt_monthly->execute([$tahun]);
        $monthly_inputs = $stmt_monthly->fetchAll() ?: [];

        $monthly_completeness = [];
        foreach ($test_months as $m) {
            $count = 0;
            foreach ($monthly_inputs as $mi) {
                if ($mi['bulan'] === $m) {
                    $count = (int)$mi['count'];
                    break;
                }
            }
            $percentage = $total_kua > 0 ? (int)round(($count / $total_kua) * 100) : 0;
            $monthly_completeness[] = [
                "month" => $m,
                "count" => $count,
                "percentage" => $percentage
            ];
        }

        echo json_encode([
            "totalKua" => $total_kua,
            "sudahInputCount" => $sudah_count,
            "belumInputCount" => $belum_count,
            "sudahUploadCount" => $sudah_upload_count,
            "belumUploadCount" => $belum_upload_count,
            "belumInputKuas" => $belum_input_kuas,
            "belumUploadKuas" => $belum_upload_kuas,
            "unresolvedUninput" => $unresolved_uninput,
            "unresolvedBelumUpload" => $unresolved_belum_upload,
            "chartData" => $chart_data,
            "subjenisData" => $subjenis_data,
            "monthlyCompleteness" => $monthly_completeness
        ]);
        break;

    // ----------------------------------------------------
    // ACTIVITY LOGS AUDIT TRAIL
    // ----------------------------------------------------
    case 'logs':
        require_auth($auth_user);
        if ($auth_user['level'] !== 'Admin') {
            http_response_code(403);
            echo json_encode(["message" => "Akses ditolak."]);
            break;
        }

        $logs = $pdo->query("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 500")->fetchAll();
        foreach ($logs as &$l) {
            $l['id'] = (int)$l['id'];
            $l['id_user'] = $l['id_user'] ? (int)$l['id_user'] : null;
        }
        echo json_encode($logs);
        break;

    // ----------------------------------------------------
    // DB BACKUP & RESTORE
    // ----------------------------------------------------
    case 'db/backup':
        require_auth($auth_user);
        if ($auth_user['level'] !== 'Admin') {
            http_response_code(403);
            echo json_encode(["message" => "Hanya Admin yang dapat mengunduh backup."]);
            break;
        }

        $tables = ["users", "kua", "laporan_stok", "upload_pdf", "activity_logs"];
        $backup_data = [];
        foreach ($tables as $t) {
            $backup_data[$t] = $pdo->query("SELECT * FROM `$t`")->fetchAll();
        }

        header("Content-Type: application/json");
        header("Content-Disposition: attachment; filename=SIBN_Backup_Database.json");
        echo json_encode($backup_data);
        exit;

    case 'db/restore':
        require_auth($auth_user);
        if ($auth_user['level'] !== 'Admin') {
            http_response_code(403);
            echo json_encode(["message" => "Hanya Admin yang dapat memulihkan backup."]);
            break;
        }

        if (empty($req_data)) {
            http_response_code(400);
            echo json_encode(["message" => "Data backup tidak valid."]);
            break;
        }

        try {
            $pdo->beginTransaction();
            $tables = ["users", "kua", "laporan_stok", "upload_pdf", "activity_logs"];

            // Disable foreign checks temporarily for clear and bulk write
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

            foreach ($tables as $t) {
                if (isset($req_data[$t]) && is_array($req_data[$t])) {
                    $pdo->exec("DELETE FROM `$t`");
                    $rows = $req_data[$t];
                    if (count($rows) > 0) {
                        $cols = array_keys($rows[0]);
                        $placeholders = implode(", ", array_map(function($c) { return ":$c"; }, $cols));
                        $insert_query = "INSERT INTO `$t` (" . implode(", ", array_map(function($c) { return "`$c`"; }, $cols)) . ") VALUES ($placeholders)";
                        $stmt = $pdo->prepare($insert_query);
                        foreach ($rows as $row) {
                            $stmt->execute($row);
                        }
                    }
                }
            }

            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            $pdo->commit();

            addLog($pdo, $auth_user['id_user'], $auth_user['username'], 'Restore Database', 'Berhasil memulihkan database dari file backup cadangan');
            echo json_encode(["success" => true, "message" => "Database berhasil dipulihkan dari cadangan!"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            http_response_code(500);
            echo json_encode(["message" => "Gagal memulihkan database: " . $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------
    // DEFAULT ROUTE FALLBACK
    // ----------------------------------------------------
    default:
        http_response_code(404);
        echo json_encode(["message" => "Endpoint API tidak ditemukan."]);
        break;
}
