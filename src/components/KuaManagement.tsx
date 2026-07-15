import React, { useState, useEffect } from "react";
import { KUA, User } from "../types";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  MapPin, 
  UserCheck, 
  Save, 
  X,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Info,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface KuaProps {
  user: User;
  token: string;
}

export const KuaManagement: React.FC<KuaProps> = ({ user, token }) => {
  const [kuas, setKuas] = useState<KUA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [namaKua, setNamaKua] = useState<string>("");
  const [alamat, setAlamat] = useState<string>("");
  const [kepalaKua, setKepalaKua] = useState<string>("");
  const [nipKepala, setNipKepala] = useState<string>("");
  const [pengelolaStok, setPengelolaStok] = useState<string>("");
  const [nipPengelola, setNipPengelola] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [aktif, setAktif] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchKuas = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/kua", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Gagal mengambil data KUA dari server.");
      }
      const data = await response.json();
      setKuas(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data KUA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKuas();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNamaKua("");
    setAlamat("");
    setKepalaKua("");
    setNipKepala("");
    setPengelolaStok("");
    setNipPengelola("");
    setOperator("");
    setAktif(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (k: KUA) => {
    setEditingId(k.id_kua);
    setNamaKua(k.nama_kua);
    setAlamat(k.alamat || "");
    setKepalaKua(k.kepala_kua || "");
    setNipKepala(k.nip_kepala || "");
    setPengelolaStok(k.pengelola_stok || "");
    setNipPengelola(k.nip_pengelola || "");
    setOperator(k.operator || "");
    setAktif(k.aktif === 1);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKua && user.level === "Admin") {
      setError("Nama KUA wajib diisi!");
      return;
    }

    try {
      const url = editingId ? `/api/kua/${editingId}` : "/api/kua";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        nama_kua: namaKua,
        alamat,
        kepala_kua: kepalaKua,
        nip_kepala: nipKepala,
        pengelola_stok: pengelolaStok,
        nip_pengelola: nipPengelola,
        operator,
        aktif,
        _csrf: user.csrfToken
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal menyimpan data KUA.");
      }

      setSuccessMsg(editingId ? "KUA berhasil diperbarui!" : "KUA berhasil ditambahkan!");
      setIsModalOpen(false);
      fetchKuas();
      
      // Auto dismiss success message
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal memuat.");
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
      const response = await fetch(`/api/kua/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        }
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal menghapus KUA.");
      }

      setSuccessMsg("KUA berhasil dihapus!");
      fetchKuas();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal menghapus.");
    }
  };

  const filteredKuas = kuas.filter(k => 
    (k.nama_kua || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.alamat || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.kepala_kua || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.nip_kepala || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.pengelola_stok || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.nip_pengelola || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredKuas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedKuas = filteredKuas.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-fadeIn" id="kua-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel" id="kua-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Master Data <span className="text-gold-gradient">KUA Kecamatan</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Mengelola data Kantor Urusan Agama (KUA) se-Kabupaten Tangerang
          </p>
        </div>

        {user.level === "Admin" && (
          <button 
            onClick={handleOpenAddModal}
            className="bg-gold-gradient hover:brightness-110 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            id="add-kua-btn"
          >
            <Plus className="w-5 h-5" />
            Tambah KUA Baru
          </button>
        )}
      </div>

      {/* Info Notice for Operators */}
      {user.level === "Operator KUA" && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl flex items-start gap-3 text-xs md:text-sm" id="operator-kua-notice">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Info Operator:</span> Anda hanya memiliki izin mengelola rincian KUA Anda sendiri (<span className="font-bold text-white">{user.nama_kua || "Rajeg"}</span>). Anda dapat memperbarui alamat dan nama Kepala KUA untuk kebutuhan pencetakan.
          </div>
        </div>
      )}

      {/* Success and Error Banners */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg" id="kua-success-banner">
          <CheckCircle className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg" id="kua-error-banner">
          <XCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-white font-bold">&times;</button>
        </div>
      )}

      {/* Table & Filtering */}
      <div className="bg-white rounded-2xl p-6 shadow-md" id="kua-table-card">
        
        {/* Live Search and Record Info */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-slate-600 text-sm">
            {totalItems > 0 ? (
              <>
                Menampilkan <span className="font-bold text-slate-800">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)}</span> dari <span className="font-bold text-slate-800">{totalItems}</span> KUA Kecamatan {searchQuery && <span className="text-amber-600 text-xs">(difilter dari {kuas.length})</span>}
              </>
            ) : (
              <>Tidak ada data untuk ditampilkan</>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-slate-500">Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-gray-250 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
              <input 
                type="text" 
                placeholder="Cari nama KUA, alamat, kepala..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition-all"
                id="kua-search-input"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse text-sm text-slate-600" id="kua-table">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="py-3.5 px-4 font-semibold text-slate-700 w-12 text-center">No</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">KUA Kecamatan</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Alamat Lengkap</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Kepala KUA</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700 text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    <RefreshCw className="animate-spin text-amber-500 w-8 h-8 mx-auto mb-2" />
                    Sedang memuat data KUA...
                  </td>
                </tr>
              ) : paginatedKuas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Tidak ditemukan data KUA Kecamatan yang sesuai kata kunci.
                  </td>
                </tr>
              ) : (
                paginatedKuas.map((k, idx) => (
                  <tr key={k.id_kua} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-center text-gray-400">{indexOfFirstItem + idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                      KUA {k.nama_kua}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate" title={k.alamat}>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {k.alamat || "-"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {k.kepala_kua || "-"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${k.aktif === 1 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {k.aktif === 1 ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Button */}
                        {(user.level === "Admin" || (user.level === "Operator KUA" && user.id_kua === k.id_kua)) && (
                          <button 
                            onClick={() => handleOpenEditModal(k)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Rincian"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Button (Admin Only) */}
                        {user.level === "Admin" && (
                          <button 
                            onClick={() => handleDelete(k.id_kua)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus KUA"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {user.level === "Viewer" && <span className="text-gray-400 text-xs font-mono">-</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100" id="kua-pagination-controls">
            <div className="text-xs text-slate-500">
              Halaman <span className="font-bold text-slate-700">{currentPage}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-xl hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed text-slate-600 transition-all cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isFirst = pageNum === 1;
                const isLast = pageNum === totalPages;
                const isCurrent = pageNum === currentPage;
                const isNear = Math.abs(pageNum - currentPage) <= 1;

                if (isFirst || isLast || isNear) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-gold-gradient text-slate-950 shadow-sm font-extrabold"
                          : "border border-gray-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }

                if (
                  (pageNum === 2 && currentPage > 3) ||
                  (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  return (
                    <span key={pageNum} className="text-gray-400 text-xs px-1 select-none">
                      ...
                    </span>
                  );
                }

                return null;
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-xl hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed text-slate-600 transition-all cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          ADD / EDIT KUA MODAL
          ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="kua-form-modal">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-800 p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="text-amber-500 w-5 h-5" />
                {editingId ? "Edit Rincian KUA" : "Tambah KUA Baru"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex flex-col max-h-[85vh]">
              
              {/* Scrollable Form Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Nama KUA */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Nama KUA Kecamatan</label>
                  <input 
                    type="text" 
                    value={namaKua}
                    onChange={(e) => setNamaKua(e.target.value)}
                    disabled={user.level !== "Admin" || editingId !== null}
                    required
                    placeholder="Contoh: Rajeg"
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  {!editingId && user.level === "Admin" && (
                    <p className="text-[10px] text-gray-400 mt-1">Sistem otomatis akan membuat akun login operator username &apos;{namaKua.toLowerCase().replace(/\s+/g, "")}&apos; dengan password default &apos;12345&apos;</p>
                  )}
                </div>

                {/* 1. Alamat Lengkap KUA */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">1. Alamat Lengkap KUA</label>
                  <textarea 
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    rows={3}
                    required
                    placeholder="Tuliskan jalan, nomor, RT/RW, kelurahan, kecamatan, kode pos..."
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* 2. Nama Kepala KUA */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">2. Nama Kepala KUA</label>
                  <input 
                    type="text" 
                    value={kepalaKua}
                    onChange={(e) => setKepalaKua(e.target.value)}
                    required
                    placeholder="Contoh: H. Mulyadi S.HI"
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 3. NIP Kepala KUA */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">3. NIP Kepala KUA</label>
                  <input 
                    type="text" 
                    value={nipKepala}
                    onChange={(e) => setNipKepala(e.target.value)}
                    placeholder="Masukkan NIP Kepala KUA..."
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 4. Nama Pengelola Data Stok */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">4. Nama Pengelola Data Stok</label>
                  <input 
                    type="text" 
                    value={pengelolaStok}
                    onChange={(e) => setPengelolaStok(e.target.value)}
                    placeholder="Masukkan nama pengelola data stok..."
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 5. NIP Pengelola Data Stok */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">5. NIP Pengelola Data Stok</label>
                  <input 
                    type="text" 
                    value={nipPengelola}
                    onChange={(e) => setNipPengelola(e.target.value)}
                    placeholder="Masukkan NIP pengelola data stok..."
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Status Aktif (Admin Only) */}
                {user.level === "Admin" && (
                  <div className="flex items-center justify-between py-2 border-t border-gray-800 mt-2">
                    <div>
                      <span className="block text-sm font-semibold text-white">Status KUA</span>
                      <span className="text-[11px] text-gray-400">Nonaktif menghentikan pengisian laporan</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAktif(!aktif)}
                      className="text-amber-500 hover:text-amber-400 focus:outline-none cursor-pointer"
                    >
                      {aktif ? <ToggleRight className="w-11 h-11" /> : <ToggleLeft className="w-11 h-11 text-gray-500" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-800 p-4 flex justify-end gap-2 border-t border-gray-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-gold-gradient hover:brightness-110 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Simpan Rincian
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="kua-delete-confirm-overlay">
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-scaleIn" id="kua-delete-confirm-card">
            
            {/* Elegant Top Red Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-rose-500 rounded-b-md" />

            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Konfirmasi Hapus KUA</h3>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data KUA ini? <span className="text-rose-400 font-bold">Semua data laporan stok dan file PDF KUA ini juga akan dihapus secara permanen dari database!</span>
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
