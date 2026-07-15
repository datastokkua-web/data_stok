import React, { useState, useEffect, useRef } from "react";
import { User, KUA, PdfUpload } from "../types";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Eye, 
  Download, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Building,
  Calendar,
  Lock
} from "lucide-react";

interface PdfProps {
  user: User;
  token: string;
}

export const PdfUploads: React.FC<PdfProps> = ({ user, token }) => {
  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [kuas, setKuas] = useState<KUA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Upload Form State
  const [uploadKuaId, setUploadKuaId] = useState<string>("");
  const [uploadMonth, setUploadMonth] = useState<string>("Juli");
  const [uploadYear, setUploadYear] = useState<number>(2026);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [lockStatus, setLockStatus] = useState<{ isLocked: boolean; message?: string }>({ isLocked: false });
  const [checkingLock, setCheckingLock] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years = [2024, 2025, 2026, 2027];

  const checkLock = async (kuaId: string, month: string, year: number) => {
    if (!kuaId || !month || !year || user.level === "Admin") {
      setLockStatus({ isLocked: false });
      return;
    }
    setCheckingLock(true);
    try {
      const response = await fetch(`/api/stok/lock-status?id_kua=${kuaId}&bulan=${month}&tahun=${year}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLockStatus(data);
      } else {
        setLockStatus({ isLocked: false });
      }
    } catch (err) {
      console.error("Gagal memeriksa status kunci pdf:", err);
      setLockStatus({ isLocked: false });
    } finally {
      setCheckingLock(false);
    }
  };

  useEffect(() => {
    if (uploadKuaId) {
      checkLock(uploadKuaId, uploadMonth, uploadYear);
    }
  }, [uploadKuaId, uploadMonth, uploadYear]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch PDF uploads list
      const pdfRes = await fetch("/api/pdf", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!pdfRes.ok) throw new Error("Gagal memuat dokumen PDF.");
      const pdfData = await pdfRes.json();
      setUploads(pdfData);

      // 2. Fetch KUAs for dropdown
      const kRes = await fetch("/api/kua", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (kRes.ok) {
        const kData = await kRes.json();
        setKuas(kData);
        if (kData.length > 0) {
          if (user.level === "Operator KUA" && user.id_kua) {
            setUploadKuaId(user.id_kua.toString());
          } else {
            setUploadKuaId(kData[0].id_kua.toString());
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Drag & Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError("");
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Hanya file dokumen PDF yang diperbolehkan!");
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError("Ukuran file melebihi batas maksimal 5 MB!");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Submit Upload to Backend
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadKuaId || !selectedFile) {
      setError("Pilih KUA Kecamatan dan pilih file PDF terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("id_kua", uploadKuaId);
      formData.append("bulan", uploadMonth);
      formData.append("tahun", uploadYear.toString());
      formData.append("_csrf", user.csrfToken);

      const response = await fetch("/api/pdf/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        },
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal mengunggah file PDF.");
      }

      setSuccess(`File PDF laporan berhasil diunggah dengan nama resmi: ${resData.filename}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchData();
      
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Gagal mengunggah PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);

    try {
      const response = await fetch(`/api/pdf/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        }
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal menghapus file.");
      }

      setSuccess("File PDF laporan berhasil dihapus.");
      fetchData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal menghapus PDF.");
    }
  };

  const filteredUploads = uploads.filter(p => 
    (p.nama_file && p.nama_file.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.bulan && p.bulan.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.nama_kua && p.nama_kua.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn" id="pdf-uploads-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel" id="pdf-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Unggah Dokumen <span className="text-gold-gradient">PDF Laporan Stok</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Mengunggah scan tanda tangan berkas persetujuan fisik laporan stok bulanan (Maks 5 MB)
          </p>
        </div>
      </div>

      {/* Success and Error Banners */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="pdf-grid-section">
        
        {/* Upload Form Box (Hidden for Viewers) */}
        {user.level !== "Viewer" ? (
          <div className="bg-white rounded-2xl p-6 shadow-md flex flex-col justify-between border border-gray-100" id="pdf-upload-form-card">
            <div>
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Upload className="text-amber-600 w-5 h-5" />
                Unggah File Baru
              </h3>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                
                {/* KUA Select (Locked for operators) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">KUA Kecamatan</label>
                  <select
                    value={uploadKuaId}
                    onChange={(e) => setUploadKuaId(e.target.value)}
                    disabled={user.level === "Operator KUA" && !!user.id_kua}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-75"
                  >
                    {kuas.map(k => (
                      <option key={k.id_kua} value={k.id_kua}>KUA Kecamatan {k.nama_kua}</option>
                    ))}
                  </select>
                </div>

                {/* Period Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Bulan</label>
                    <select
                      value={uploadMonth}
                      onChange={(e) => setUploadMonth(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tahun</label>
                    <select
                      value={uploadYear}
                      onChange={(e) => setUploadYear(parseInt(e.target.value, 10))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={(e) => { if (!lockStatus.isLocked) handleDragOver(e); }}
                  onDragLeave={() => { if (!lockStatus.isLocked) handleDragLeave(); }}
                  onDrop={(e) => { if (!lockStatus.isLocked) handleDrop(e); }}
                  onClick={() => {
                    if (lockStatus.isLocked) return;
                    fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    lockStatus.isLocked
                      ? "border-rose-300/30 bg-rose-500/5 cursor-not-allowed"
                      : dragOver 
                        ? "border-amber-500 bg-amber-500/5 scale-98" 
                        : selectedFile 
                          ? "border-emerald-500 bg-emerald-50/20" 
                          : "border-gray-300 hover:border-amber-400 bg-slate-50/50"
                  }`}
                  id="pdf-drag-drop-zone"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="application/pdf"
                    className="hidden"
                    disabled={lockStatus.isLocked}
                  />
                  
                  {lockStatus.isLocked ? (
                    <div className="space-y-2 text-rose-500/70">
                      <Lock className="w-10 h-10 text-rose-500 mx-auto animate-pulse" />
                      <span className="block text-xs font-bold text-rose-600 uppercase">Dokumen Terkunci</span>
                      <span className="block text-[10px] text-rose-500/80 max-w-[220px] mx-auto leading-relaxed">
                        {lockStatus.message}
                      </span>
                    </div>
                  ) : selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 text-emerald-600 mx-auto" />
                      <span className="block text-xs font-bold text-slate-800 truncate max-w-[200px]">{selectedFile.name}</span>
                      <span className="block text-[10px] text-gray-500 font-mono">({Math.round(selectedFile.size / 1024)} KB)</span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-gray-500">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                      <span className="block text-xs font-semibold">Tarik & Lepas PDF atau <span className="text-amber-600 underline">Pilih File</span></span>
                      <span className="block text-[10px] text-gray-400">Hanya format PDF, Maksimal 5MB</span>
                    </div>
                  )}
                </div>

                {/* Auto Rename Hint */}
                {uploadKuaId && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 text-[10px] text-slate-500">
                    <span className="font-bold block text-slate-700">Skema Nama File Otomatis:</span>
                    {kuas.find(k => k.id_kua.toString() === uploadKuaId)?.nama_kua.replace(/\s+/g, "_")}_{uploadMonth}_{uploadYear}.pdf
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !selectedFile || lockStatus.isLocked}
                  className={`w-full ${
                    lockStatus.isLocked 
                      ? "bg-slate-200 text-gray-400 border border-slate-300 cursor-not-allowed hover:brightness-100 shadow-none" 
                      : "bg-gold-gradient hover:brightness-110 text-slate-950 cursor-pointer shadow-md"
                  } font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2`}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="animate-spin w-4 h-4" />
                      Sedang Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {lockStatus.isLocked ? "Unggahan Terkunci" : "Mulai Unggah Dokumen"}
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col justify-center items-center text-center text-gray-400 space-y-2">
            <AlertCircle className="w-12 h-12 text-slate-300" />
            <h4 className="font-bold text-slate-700 text-sm">Mode Peninjau (Viewer)</h4>
            <p className="text-xs px-4">Viewer tidak diizinkan mengunggah file baru. Silakan pilih menu cetak/unduh di samping.</p>
          </div>
        )}

        {/* Uploads List Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-md flex flex-col justify-between border border-gray-100" id="pdf-list-card">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-amber-600 w-5 h-5" />
                Daftar Dokumen Laporan Terunggah
              </h3>

              {/* Instant Filter */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari berkas PDF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Document Listing */}
            <div className="overflow-y-auto max-h-[400px] rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="py-2.5 px-3 font-semibold text-slate-700">Berkas Laporan PDF</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700">KUA</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-center">Periode</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400">
                        <RefreshCw className="animate-spin text-amber-500 w-6 h-6 mx-auto mb-1" />
                        Memuat data berkas...
                      </td>
                    </tr>
                  ) : filteredUploads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400">
                        Belum ada dokumen PDF laporan terunggah.
                      </td>
                    </tr>
                  ) : (
                    filteredUploads.map(p => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="block font-bold text-slate-800 truncate max-w-[180px]" title={p.nama_file}>
                                {p.nama_file}
                              </span>
                              <span className="block text-[9px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(p.tanggal_upload).toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            {p.nama_kua}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="flex items-center justify-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {p.bulan} {p.tahun}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Open PDF */}
                            <a 
                              href={`/api/pdf/view/${p.nama_file}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Buka / Lihat Berkas"
                            >
                              <Eye className="w-4 h-4" />
                            </a>

                            {/* Download PDF */}
                            <a 
                              href={`/api/pdf/view/${p.nama_file}`} 
                              download={p.nama_file}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Unduh Berkas"
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            {/* Delete Button (Only Admin or Owner) */}
                            {user.level === "Admin" && (
                              <button 
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Hapus Berkas"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="pdf-delete-confirm-overlay">
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-scaleIn" id="pdf-delete-confirm-card">
            
            {/* Elegant Top Red Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-rose-500 rounded-b-md" />

            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Konfirmasi Hapus Dokumen PDF</h3>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus file PDF laporan ini? <span className="text-rose-400 font-bold">Berkas fisik laporan ini akan dihapus secara permanen dari server!</span>
                </p>
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-gray-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700/50"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
