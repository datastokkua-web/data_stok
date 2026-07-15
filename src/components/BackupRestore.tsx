import React, { useState, useRef } from "react";
import { User } from "../types";
import { 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  FileCode,
  Trash2,
  AlertTriangle
} from "lucide-react";

interface BackupProps {
  user: User;
  token: string;
}

export const BackupRestore: React.FC<BackupProps> = ({ user, token }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Admin Reset Data Form
  const [resetLaporan, setResetLaporan] = useState<boolean>(false);
  const [resetPdf, setResetPdf] = useState<boolean>(false);
  const [confirmWord, setConfirmWord] = useState<string>("");
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const handleExecuteReset = async () => {
    setShowResetModal(false);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/reset-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        },
        body: JSON.stringify({ resetLaporan, resetPdf, _csrf: user.csrfToken })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal mereset data.");
      }

      setSuccess(resData.message || "Data berhasil direset!");
      setResetLaporan(false);
      setResetPdf(false);
      setConfirmWord("");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses reset data.");
    } finally {
      setLoading(false);
    }
  };

  if (user.level !== "Admin") {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="font-bold text-lg">Akses Terbatas</h3>
          <p className="text-sm mt-1">Hanya Administrator yang memiliki akses untuk mencadangkan atau memulihkan database sistem.</p>
        </div>
      </div>
    );
  }

  // Handle Export/Download Backup
  const handleBackupExport = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/db/backup", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("Gagal mengunduh berkas backup database.");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SIBN_Backup_Database_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess("Pencadangan database berhasil diunduh!");
    } catch (err: any) {
      setError(err.message || "Gagal melakukan pencadangan.");
    } finally {
      setLoading(false);
    }
  };

  // Handle File Select for Restore
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingRestoreFile(file);
  };

  const handleCancelRestore = () => {
    setPendingRestoreFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) return;
    const file = pendingRestoreFile;
    setPendingRestoreFile(null);

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonContent = JSON.parse(event.target?.result as string);
          
          const response = await fetch("/api/db/restore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "X-XSRF-Token": user.csrfToken
            },
            body: JSON.stringify(jsonContent)
          });

          const resData = await response.json();
          if (!response.ok) {
            throw new Error(resData.message || "Gagal memulihkan database.");
          }

          setSuccess("Pemulihan database berhasil diselesaikan! Halaman akan dimuat ulang dalam 3 detik.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          
          // Reload to refresh active states
          setTimeout(() => {
            window.location.reload();
          }, 3000);

        } catch (err: any) {
          setError(err.message || "File JSON backup tidak valid atau rusak.");
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      
      reader.readAsText(file);
    } catch (err: any) {
      setError("Gagal memproses file cadangan.");
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="backup-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel" id="backup-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Pencadangan & <span className="text-gold-gradient">Pemulihan Database</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Ekspor seluruh data berjalan ke file terenkripsi JSON, atau pulihkan dari cadangan sebelumnya
          </p>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-white font-bold">&times;</button>
        </div>
      )}

      {/* Control Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="backup-controls-grid">
        
        {/* Box 1: Backup / Export */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl w-fit">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Unduh Cadangan Database</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Mengunduh salinan lengkap struktur dan seluruh rekaman database (Master KUA, Pengguna, Laporan Stok Tahunan, dan Log Aktivitas) ke dalam satu file berkas JSON terstruktur secara instan. Direkomendasikan dilakukan secara periodik demi keselamatan data.
            </p>
          </div>

          <button
            onClick={handleBackupExport}
            disabled={loading}
            className="bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-slate-950 font-bold py-3 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md w-full"
          >
            {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Database className="w-4 h-4" />}
            Mulai Cadangkan Database
          </button>
        </div>

        {/* Box 2: Restore / Import */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl w-fit">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Pulihkan Database Cadangan</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Memulihkan kembali (Restore) kondisi database SIBN dengan cara mengunggah berkas JSON cadangan yang sah. Proses pemulihan ini akan <span className="font-bold text-rose-600">mengganti seluruh data berjalan secara total</span>. Pastikan berkas cadangan Anda asli dan terbitan sistem SIBN resmi.
            </p>
          </div>

          <div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleRestoreFileSelect}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-gray-800 w-full"
            >
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <FileCode className="w-4 h-4 text-rose-500" />}
              Pilih File Cadangan & Pulihkan
            </button>
          </div>
        </div>

      </div>

      {/* CUSTOM RESTORE CONFIRMATION MODAL */}
      {pendingRestoreFile !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="restore-confirm-overlay">
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-scaleIn" id="restore-confirm-card">
            
            {/* Elegant Top Gold Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-rose-500 rounded-b-md" />

            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                <Database className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Peringatan Keras Pemulihan</h3>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                  Memulihkan database dari file cadangan <span className="text-rose-400 font-bold font-mono">"{pendingRestoreFile.name}"</span> akan <span className="text-rose-400 font-bold">menghapus total seluruh data berjalan saat ini</span> (KUA, Pengguna, Laporan, Log, dll.) secara permanen dan menggantikannya dengan data dari file cadangan ini!
                </p>
                <p className="text-amber-500 text-[10px] font-bold mt-2 animate-pulse uppercase">
                  Tindakan ini tidak dapat dibatalkan!
                </p>
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  onClick={handleCancelRestore}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-gray-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700/50"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmRestore}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  Ya, Mulai Pulihkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
