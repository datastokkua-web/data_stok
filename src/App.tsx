import React, { useState, useEffect } from "react";
import { User } from "./types";
import { KemenagLogo } from "./components/KemenagLogo";
import { Dashboard } from "./components/Dashboard";
import { KuaManagement } from "./components/KuaManagement";
import { UserManagement } from "./components/UserManagement";
import { LaporanStok } from "./components/LaporanStok";
import { PdfUploads } from "./components/PdfUploads";
import { ActivityLogs } from "./components/ActivityLogs";
import { BackupRestore } from "./components/BackupRestore";

import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  FileText, 
  UploadCloud, 
  History, 
  Database, 
  KeyRound, 
  LogOut, 
  Menu, 
  X, 
  Lock, 
  User as UserIcon,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  // Login Form States
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Change Password Form States
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [passwordSuccess, setPasswordSuccess] = useState<string>("");
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // Time ticker state
  const [currentTime, setCurrentTime] = useState<string>("");

  // Restore session on load
  useEffect(() => {
    const savedToken = localStorage.getItem("sibn_token");
    const savedUser = localStorage.getItem("sibn_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }

    // Tick-tock clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("id-ID", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        timeZoneName: "short"
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync dark mode style on document body
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      root.style.backgroundColor = "#111827";
    } else {
      root.classList.remove("dark");
      root.style.backgroundColor = "#f3f4f6";
    }
  }, [isDarkMode]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Gagal masuk. Username atau Password salah.");
      }

      setToken(data.token);
      setCurrentUser(data.user);

      if (rememberMe) {
        localStorage.setItem("sibn_token", data.token);
        localStorage.setItem("sibn_user", JSON.stringify(data.user));
      }

      setLoginUsername("");
      setLoginPassword("");
      setCurrentView("dashboard");
    } catch (err: any) {
      setLoginError(err.message || "Kombinasi login salah.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("sibn_token");
    localStorage.removeItem("sibn_user");
    setCurrentView("dashboard");
    setShowLogoutModal(false);
  };

  // Handle Change Password Form
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok!");
      return;
    }
    if (newPassword.length < 5) {
      setPasswordError("Password baru harus minimal 5 karakter!");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": currentUser?.csrfToken || ""
        },
        body: JSON.stringify({ oldPassword, newPassword, _csrf: currentUser?.csrfToken })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal memperbarui sandi.");
      }

      setPasswordSuccess("Sandi berhasil diperbarui secara aman!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Gagal memperbarui sandi.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Route/View selector
  const renderView = () => {
    if (!currentUser || !token) return null;

    switch (currentView) {
      case "dashboard":
        return <Dashboard user={currentUser} token={token} onNavigate={setCurrentView} isDarkMode={isDarkMode} />;
      case "kua":
        return <KuaManagement user={currentUser} token={token} />;
      case "users":
        return <UserManagement user={currentUser} token={token} />;
      case "laporan":
        return <LaporanStok user={currentUser} token={token} />;
      case "pdf":
        return <PdfUploads user={currentUser} token={token} />;
      case "logs":
        return <ActivityLogs user={currentUser} token={token} />;
      case "backup":
        return <BackupRestore user={currentUser} token={token} />;
      case "password":
        return (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-md animate-fadeIn" id="password-change-box">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <KeyRound className="text-amber-600 w-5 h-5" />
              Perbarui Kata Sandi (Password)
            </h2>

            {passwordError && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold mb-4">
                <XCircle className="w-4 h-4 shrink-0" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold mb-4">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi Saat Ini (Lama)</label>
                <input 
                  type="password" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  placeholder="Masukkan kata sandi lama Anda..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Masukkan kata sandi baru (min 5 karakter)..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Konfirmasi Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Ketik ulang kata sandi baru..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <KeyRound className="w-4 h-4" />
                Perbarui Password Akun
              </button>
            </form>
          </div>
        );
      default:
        return <div className="text-gray-400">Halaman tidak ditemukan.</div>;
    }
  };

  // ==========================================
  // UNAUTHENTICATED: LOGIN VIEW
  // ==========================================
  if (!currentUser || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111827] px-4 py-12 relative overflow-hidden font-sans select-none" id="login-layout">
        
        {/* Background abstract layout elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-600/5 blur-[120px] pointer-events-none" />
        
        <div className="w-full max-w-md space-y-6 z-10 animate-fadeIn" id="login-form-box">
          
          {/* Logo Brand */}
          <KemenagLogo className="mb-4" size={90} />

          {/* Login Card Panel */}
          <div className="bg-slate-900/40 border border-amber-500/15 p-8 rounded-3xl shadow-2xl glass-panel relative" id="login-card">
            
            {/* Elegant Header Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[3px] bg-gold-gradient rounded-b-md" />

            <div className="text-center space-y-1.5 mb-6">
              <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
                SIBN <span className="text-gold-gradient">Login Portal</span>
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Sistem Monitoring Persediaan Blanko Nikah Kabupaten Tangerang
              </p>
            </div>

            {/* Error alerts */}
            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold mb-4 animate-shake" id="login-error-notice">
                <XCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Login form inputs */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-500 uppercase tracking-wider">Username Pengguna</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    placeholder="Masukkan username login..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-gray-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-slate-800 transition-all"
                    id="username-field"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-500 uppercase tracking-wider">Kata Sandi (Password)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-gray-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-slate-800 transition-all"
                    id="password-field"
                  />
                </div>
              </div>

              {/* Remember me bar */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 text-gray-400 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-amber-500 rounded border-gray-600 focus:ring-0 cursor-pointer"
                  />
                  Remember Me
                </label>
                <span className="text-[10px] text-gray-500 italic">Sandi default: &apos;12345&apos; / &apos;admin123&apos;</span>
              </div>

              {/* Enter portal button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-4 bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-slate-950 font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xl"
                id="login-btn"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="animate-spin w-4.5 h-4.5" />
                    Sedang Memproses...
                  </>
                ) : (
                  <>
                    Masuk Portal SIBN
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>

            </form>
          </div>

          <div className="text-center text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Sistem Informasi Blanko Nikah &copy; 2026 Kemenag Tangerang
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED: MAIN SYSTEM WORKSPACE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#111827] flex font-sans text-slate-200" id="sibn-workspace">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside 
        className={`bg-[#1E293B] border-r border-gray-800/50 flex flex-col justify-between shrink-0 transition-all duration-300 no-print ${
          isSidebarOpen ? "w-64" : "w-0 md:w-20 overflow-hidden"
        }`}
        id="sibn-sidebar"
      >
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Brand/Header */}
          <div className="p-4 flex items-center gap-3 border-b border-gray-800/80 bg-slate-900/20">
            <div className="bg-amber-500/10 p-1.5 rounded-xl border border-amber-500/20 shrink-0">
              <Building2 className="w-6 h-6 text-amber-500" />
            </div>
            {isSidebarOpen && (
              <div>
                <span className="block font-extrabold text-white text-base tracking-wide leading-none font-mono">SIBN</span>
                <span className="block text-[9px] text-amber-400 font-bold uppercase mt-1">Kab. Tangerang</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {/* Dashboard Link */}
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                currentView === "dashboard" 
                  ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                  : "text-gray-300 hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
              {isSidebarOpen && "Dashboard"}
            </button>

            {/* Master KUA Link */}
            <button
              onClick={() => setCurrentView("kua")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                currentView === "kua" 
                  ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                  : "text-gray-300 hover:bg-slate-800/60"
              }`}
            >
              <Building2 className="w-4.5 h-4.5 shrink-0" />
              {isSidebarOpen && "Master KUA"}
            </button>

            {/* Laporan Stok Link */}
            <button
              onClick={() => setCurrentView("laporan")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                currentView === "laporan" 
                  ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                  : "text-gray-300 hover:bg-slate-800/60"
              }`}
            >
              <FileText className="w-4.5 h-4.5 shrink-0" />
              {isSidebarOpen && "Laporan Stok"}
            </button>

            {/* Upload PDF Link */}
            <button
              onClick={() => setCurrentView("pdf")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                currentView === "pdf" 
                  ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                  : "text-gray-300 hover:bg-slate-800/60"
              }`}
            >
              <UploadCloud className="w-4.5 h-4.5 shrink-0" />
              {isSidebarOpen && "Upload PDF"}
            </button>

            {/* Kelola User (Admin Only) */}
            {currentUser.level === "Admin" && (
              <button
                onClick={() => setCurrentView("users")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  currentView === "users" 
                    ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                    : "text-gray-300 hover:bg-slate-800/60"
                }`}
              >
                <Users className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && "Kelola User"}
              </button>
            )}

            {/* Riwayat Aktivitas (Admin Only) */}
            {currentUser.level === "Admin" && (
              <button
                onClick={() => setCurrentView("logs")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  currentView === "logs" 
                    ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                    : "text-gray-300 hover:bg-slate-800/60"
                }`}
              >
                <History className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && "Aktivitas Log"}
              </button>
            )}

            {/* Backup & Restore (Admin Only) */}
            {currentUser.level === "Admin" && (
              <button
                onClick={() => setCurrentView("backup")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  currentView === "backup" 
                    ? "bg-amber-500 text-slate-950 font-bold font-semibold" 
                    : "text-gray-300 hover:bg-slate-800/60"
                }`}
              >
                <Database className="w-4.5 h-4.5 shrink-0" />
                {isSidebarOpen && "Backup & Restore"}
              </button>
            )}
          </nav>
        </div>

        {/* Footer Area with Password / Logout */}
        <div className="p-3 border-t border-gray-800/80 bg-slate-900/10 space-y-1">
          {/* Change password link */}
          <button
            onClick={() => setCurrentView("password")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              currentView === "password" 
                ? "bg-amber-500/10 text-amber-400 font-semibold" 
                : "text-gray-400 hover:bg-slate-800/30 hover:text-white"
            }`}
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            {isSidebarOpen && "Ganti Password"}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isSidebarOpen && "Logout Sesi"}
          </button>
        </div>

      </aside>

      {/* 2. MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen" id="sibn-workspace-body">
        
        {/* Top Header Navbar */}
        <header className="h-16 border-b border-gray-800/50 bg-[#111827] flex items-center justify-between px-6 z-20 no-print" id="sibn-navbar">
          
          <div className="flex items-center gap-4">
            {/* Sidebar trigger */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* SIBN App identity header */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-500 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase hidden sm:inline-block font-mono">Kemenag</span>
              <span className="text-xs text-gray-300 font-medium hidden md:inline-block">Kabupaten Tangerang</span>
            </div>
          </div>

          {/* Time & User session profile */}
          <div className="flex items-center gap-4 text-xs">
            
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1.5 text-gray-400 font-semibold bg-slate-800/30 border border-gray-800/50 px-3 py-1.5 rounded-xl font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {currentTime}
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-2.5 bg-slate-800/50 border border-gray-800 px-3 py-1.5 rounded-xl">
              <div className="w-6.5 h-6.5 bg-amber-500 text-slate-950 font-extrabold text-[10px] rounded-full flex items-center justify-center font-mono">
                {currentUser.nama.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left leading-none">
                <span className="block font-bold text-white text-[11px] truncate max-w-[120px]">{currentUser.nama}</span>
                <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 inline-block">{currentUser.level}</span>
              </div>
            </div>

          </div>

        </header>

        {/* Scrollable workspace core view body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" id="sibn-core-content">
          {renderView()}
        </main>

        {/* Footer info (No Print) */}
        <footer className="h-10 border-t border-gray-800/40 bg-[#111827] flex items-center justify-between px-6 text-[10px] text-gray-500 no-print">
          <span>Kabupaten Tangerang &copy; 2026. Hak Cipta Dilindungi.</span>
          <span className="flex items-center gap-1 font-semibold text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure SSL Sandbox Encrypted
          </span>
        </footer>

      </div>

      {/* CUSTOM LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" id="logout-confirm-overlay">
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-scaleIn" id="logout-confirm-card">
            
            {/* Elegant Top Gold Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-rose-500 rounded-b-md" />

            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 animate-pulse">
                <LogOut className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Konfirmasi Keluar Sesi</h3>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                  Apakah Anda yakin ingin keluar dari sistem <span className="text-amber-400 font-bold font-mono">SIBN</span>? Anda perlu memasukkan kata sandi kembali untuk mengakses data persediaan blanko nikah.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-gray-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700/50"
                  id="logout-cancel-btn"
                >
                  Batal
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
                  id="logout-approve-btn"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
