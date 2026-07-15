import React, { useState, useEffect } from "react";
import { User, KUA } from "../types";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  UserCheck, 
  ShieldAlert, 
  Lock, 
  Save, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Building,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface UserManagementProps {
  user: User;
  token: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ user, token }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [kuas, setKuas] = useState<KUA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [nama, setNama] = useState<string>("");
  const [level, setLevel] = useState<"Admin" | "Operator KUA" | "Viewer">("Operator KUA");
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif");
  const [selectedKuaId, setSelectedKuaId] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Users
      const uRes = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!uRes.ok) throw new Error("Gagal mengambil data pengguna.");
      const uData = await uRes.json();
      setUsers(uData);

      // 2. Fetch KUAs for dropdown
      const kRes = await fetch("/api/kua", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (kRes.ok) {
        const kData = await kRes.json();
        setKuas(kData);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.level === "Admin") {
      fetchData();
    }
  }, []);

  if (user.level !== "Admin") {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="font-bold text-lg">Akses Terbatas</h3>
          <p className="text-sm mt-1">Hanya pengguna bertingkat Administrator yang dapat mengakses halaman pengelolaan pengguna ini.</p>
        </div>
      </div>
    );
  }

  const handleOpenAddModal = () => {
    setEditingId(null);
    setUsername("");
    setPassword("");
    setNama("");
    setLevel("Operator KUA");
    setStatus("Aktif");
    setSelectedKuaId(kuas[0]?.id_kua?.toString() || "");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: any) => {
    setEditingId(u.id_user);
    setUsername(u.username);
    setPassword(""); // Keep blank to not update password unless filled
    setNama(u.nama);
    setLevel(u.level);
    setStatus(u.status);
    setSelectedKuaId(u.id_kua?.toString() || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !nama || !level) {
      setError("Silakan lengkapi kolom yang wajib diisi.");
      return;
    }
    if (!editingId && !password) {
      setError("Kata sandi wajib diisi untuk pengguna baru.");
      return;
    }

    try {
      const url = editingId ? `/api/users/${editingId}` : "/api/users";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        username: username.toLowerCase().replace(/\s+/g, ""),
        password: password || undefined, // Send password only if set
        nama,
        level,
        status,
        id_kua: level === "Operator KUA" && selectedKuaId ? parseInt(selectedKuaId, 10) : null,
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
        throw new Error(resData.message || "Gagal menyimpan data pengguna.");
      }

      setSuccessMsg(editingId ? "Data pengguna berhasil diperbarui!" : "Pengguna baru berhasil ditambahkan!");
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
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
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        }
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal menghapus pengguna.");
      }

      setSuccessMsg("Pengguna berhasil dihapus!");
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Gagal menghapus.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.level.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nama_kua && u.nama_kua.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-fadeIn" id="users-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel" id="users-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Pengaturan <span className="text-gold-gradient">Hak Akses Pengguna</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Mengelola akun admin, operator KUA kecamatan, dan akun peninjau (viewer)
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="bg-gold-gradient hover:brightness-110 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          id="add-user-btn"
        >
          <Plus className="w-5 h-5" />
          Tambah Akun Baru
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg">
          <CheckCircle className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg">
          <XCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-white font-bold">&times;</button>
        </div>
      )}

      {/* Users Table Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-md" id="users-table-card">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-slate-600 text-sm">
            {totalItems > 0 ? (
              <>
                Menampilkan <span className="font-bold text-slate-800">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)}</span> dari <span className="font-bold text-slate-800">{totalItems}</span> Akun {searchQuery && <span className="text-amber-600 text-xs">(difilter dari {users.length})</span>}
              </>
            ) : (
              <>Tidak ada data untuk ditampilkan</>
            )}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
            <input 
              type="text" 
              placeholder="Cari nama, username, tingkat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition-all"
              id="users-search-input"
            />
          </div>
        </div>

        {/* User Database Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="py-3.5 px-4 font-semibold text-slate-700 w-12 text-center">No</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Nama Lengkap</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Username</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Tingkat Akses</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">KUA Unit Kerja</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700 text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    <RefreshCw className="animate-spin text-amber-500 w-8 h-8 mx-auto mb-2" />
                    Sedang memuat data akun...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Tidak ditemukan pengguna yang sesuai kata kunci.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => (
                  <tr key={u.id_user} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-center text-gray-400">{indexOfFirstItem + idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                      {u.nama}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">{u.username}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.level === "Admin" ? "bg-red-50 text-red-700 border border-red-100" : u.level === "Viewer" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-amber-50 text-amber-800 border border-amber-100"}`}>
                        {u.level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {u.level === "Operator KUA" ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                           <Building className="w-3.5 h-3.5 text-slate-500" />
                           KUA {u.nama_kua || "Tidak Terkait"}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Semua KUA / Wilayah</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${u.status === "Aktif" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Pengguna"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {u.id_user !== user.id_user ? (
                          <button 
                            onClick={() => handleDelete(u.id_user)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Sesi Anda</span>
                        )}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100" id="users-pagination-controls">
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
          ADD / EDIT USER MODAL
          ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="user-form-modal">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-800 p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-amber-500 w-5 h-5" />
                {editingId ? "Edit Akun Pengguna" : "Daftarkan Pengguna Baru"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  placeholder="Contoh: Drs. H. Ahmad Fauzi"
                  className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Username Login</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={!!editingId}
                  placeholder="Contoh: rajeg (lowercase)"
                  className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Kata Sandi (Password)</label>
                  {editingId && <span className="text-[10px] text-amber-500 font-medium">Kosongkan jika tidak diubah</span>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingId}
                    placeholder={editingId ? "Tulis sandi baru jika ingin mereset..." : "Tulis kata sandi login aman..."}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Level & Status Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Level */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Tingkat Akses</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Admin">Administrator</option>
                    <option value="Operator KUA">Operator KUA</option>
                    <option value="Viewer">Viewer (Peninjau)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Status Akun</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Ditangguhkan</option>
                  </select>
                </div>
              </div>

              {/* KUA Association (Conditional for Operator) */}
              {level === "Operator KUA" && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Penugasan KUA Unit Kerja</label>
                  <select
                    value={selectedKuaId}
                    onChange={(e) => setSelectedKuaId(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Pilih KUA Penugasan --</option>
                    {kuas.map(k => (
                      <option key={k.id_kua} value={k.id_kua}>KUA {k.nama_kua}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Operator KUA hanya diizinkan menginput dan melihat data KUA terpilih ini.</p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="bg-slate-800 -mx-6 -mb-6 p-4 mt-6 flex justify-end gap-2 border-t border-gray-800">
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
                  Simpan Pengguna
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="user-delete-confirm-overlay">
          <div className="bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-scaleIn" id="user-delete-confirm-card">
            
            {/* Elegant Top Red Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-rose-500 rounded-b-md" />

            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight uppercase">Konfirmasi Hapus Pengguna</h3>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun pengguna ini? <span className="text-rose-400 font-bold">Tindakan ini bersifat permanen dan akun tidak akan bisa digunakan kembali!</span>
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
