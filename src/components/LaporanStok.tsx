import React, { useState, useEffect } from "react";
import { User, KUA, PivotRow } from "../types";
import { 
  Search, 
  Calendar, 
  FileText, 
  Edit, 
  Download, 
  Printer, 
  Plus,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Building2,
  Lock
} from "lucide-react";

interface LaporanProps {
  user: User;
  token: string;
}

export const LaporanStok: React.FC<LaporanProps> = ({ user, token }) => {
  const [kuas, setKuas] = useState<KUA[]>([]);
  const [selectedKuaId, setSelectedKuaId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [pivotData, setPivotData] = useState<PivotRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Input/Edit Form State
  const [isInputMode, setIsInputMode] = useState<boolean>(false);
  const [inputMonth, setInputMonth] = useState<string>("Juli");
  const [inputYear, setInputYear] = useState<number>(2026);
  const [inputValues, setInputValues] = useState<{ [key: string]: number }>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [lockStatus, setLockStatus] = useState<{ isLocked: boolean; message?: string }>({ isLocked: false });
  const [checkingLock, setCheckingLock] = useState<boolean>(false);

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years = [2024, 2025, 2026, 2027];

  // The 15 standard rows defined structurally (6 rows removed as requested)
  const rowStructures = [
    { label: "Model NB Masuk (Penerimaan)", jenis: "Masuk", subjenis: "NB", kategori: "" },
    { label: "Model N Masuk (Penerimaan)", jenis: "Masuk", subjenis: "N", kategori: "" },
    { label: "Model NA Masuk (Penerimaan)", jenis: "Masuk", subjenis: "NA", kategori: "" },
    
    { label: "Model NB Keluar - Peristiwa Nikah", jenis: "Keluar", subjenis: "NB", kategori: "Nikah" },
    
    { label: "Model N Keluar - Peristiwa Nikah", jenis: "Keluar", subjenis: "N", kategori: "Nikah" },
    { label: "Model N Keluar - Isbat Nikah", jenis: "Keluar", subjenis: "N", kategori: "Isbat" },
    
    { label: "Model NA Keluar - Peristiwa Nikah", jenis: "Keluar", subjenis: "NA", kategori: "Nikah" },
    { label: "Model NA Keluar - Isbat Nikah", jenis: "Keluar", subjenis: "NA", kategori: "Isbat" },
    { label: "Model NA Keluar - Duplikat Nikah", jenis: "Keluar", subjenis: "NA", kategori: "Duplikat" },

    { label: "Model NB Rusak - Peristiwa Nikah", jenis: "Rusak", subjenis: "NB", kategori: "Nikah" },

    { label: "Model N Rusak - Peristiwa Nikah", jenis: "Rusak", subjenis: "N", kategori: "Nikah" },
    { label: "Model N Rusak - Isbat Nikah", jenis: "Rusak", subjenis: "N", kategori: "Isbat" },

    { label: "Model NA Rusak - Peristiwa Nikah", jenis: "Rusak", subjenis: "NA", kategori: "Nikah" },
    { label: "Model NA Rusak - Isbat Nikah", jenis: "Rusak", subjenis: "NA", kategori: "Isbat" },
    { label: "Model NA Rusak - Duplikat Nikah", jenis: "Rusak", subjenis: "NA", kategori: "Duplikat" }
  ];

  // Helper key for input bindings
  const getRowKey = (jenis: string, subjenis: string, kategori: string) => {
    return `${jenis}_${subjenis}_${kategori}`;
  };

  const fetchKuas = async () => {
    try {
      const response = await fetch("/api/kua", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setKuas(data);
        if (data.length > 0) {
          // If operator, default to their KUA, otherwise first KUA
          if (user.level === "Operator KUA" && user.id_kua) {
            setSelectedKuaId(user.id_kua.toString());
          } else {
            setSelectedKuaId(data[0].id_kua.toString());
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPivot = async () => {
    if (!selectedKuaId || !selectedYear) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stok/pivot?id_kua=${selectedKuaId}&tahun=${selectedYear}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Gagal memuat rekapitulasi stok.");
      }
      const data = await res.json();
      setPivotData(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKuas();
  }, []);

  useEffect(() => {
    fetchPivot();
  }, [selectedKuaId, selectedYear]);

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
      console.error("Gagal memeriksa status kunci laporan:", err);
      setLockStatus({ isLocked: false });
    } finally {
      setCheckingLock(false);
    }
  };

  useEffect(() => {
    if (isInputMode && selectedKuaId) {
      checkLock(selectedKuaId, inputMonth, inputYear);
    }
  }, [isInputMode, selectedKuaId, inputMonth, inputYear]);

  const loadEditData = async (month: string, year: number) => {
    setFormError("");
    const initialInputs: { [key: string]: number } = {};
    rowStructures.forEach(r => {
      initialInputs[getRowKey(r.jenis, r.subjenis, r.kategori)] = 0;
    });

    try {
      const response = await fetch(`/api/stok/detail?id_kua=${selectedKuaId}&bulan=${month}&tahun=${year}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const existingData = await response.json() as any[];
        existingData.forEach((row: any) => {
          const key = getRowKey(row.jenis, row.subjenis, row.kategori || "");
          initialInputs[key] = row.jumlah;
        });
      }
    } catch (err) {
      console.error("Gagal mengambil detail untuk edit:", err);
      setFormError("Gagal memuat rincian laporan untuk bulan/tahun terpilih.");
    }

    setInputValues(initialInputs);
  };

  // Handle preparing/editing input form
  const handleOpenInputForm = async (editMode = false) => {
    setFormError("");
    setIsEditMode(editMode);
    
    if (editMode) {
      await loadEditData(inputMonth, inputYear);
    } else {
      const initialInputs: { [key: string]: number } = {};
      rowStructures.forEach(r => {
        initialInputs[getRowKey(r.jenis, r.subjenis, r.kategori)] = 0;
      });
      setInputValues(initialInputs);
    }

    setIsInputMode(true);
  };

  // Handle saving the inputs
  const handleSaveStok = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate inputs
    const items: any[] = [];
    let hasValidationError = false;

    for (const r of rowStructures) {
      const key = getRowKey(r.jenis, r.subjenis, r.kategori);
      const val = inputValues[key];

      if (val === undefined || val === null || isNaN(val)) {
        setFormError("Kolom tidak boleh kosong!");
        hasValidationError = true;
        break;
      }

      if (val < 0) {
        setFormError("Jumlah tidak boleh bernilai negatif!");
        hasValidationError = true;
        break;
      }

      items.push({
        jenis: r.jenis,
        subjenis: r.subjenis,
        kategori: r.kategori,
        jumlah: Math.round(val)
      });
    }

    if (hasValidationError) return;

    try {
      const response = await fetch("/api/stok/input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-XSRF-Token": user.csrfToken
        },
        body: JSON.stringify({
          id_kua: parseInt(selectedKuaId, 10),
          bulan: inputMonth,
          tahun: inputYear,
          items,
          isEdit: isEditMode,
          _csrf: user.csrfToken
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal menyimpan laporan.");
      }

      setSuccess(`Laporan stok KUA berhasil disimpan untuk bulan ${inputMonth} ${inputYear}!`);
      setIsInputMode(false);
      fetchPivot();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan laporan stok.");
    }
  };

  const handleInputChange = (key: string, valueStr: string) => {
    // Prevent non-numeric values
    const cleaned = valueStr.replace(/[^0-9]/g, "");
    const parsed = cleaned === "" ? 0 : parseInt(cleaned, 10);
    setInputValues(prev => {
      const next = {
        ...prev,
        [key]: parsed
      };
      
      // If updating Model N Masuk, automatically set Model NA Masuk to 2 * Model N Masuk
      if (key === "Masuk_N_") {
        next["Masuk_NA_"] = parsed * 2;
      }
      
      return next;
    });
  };

  // Find a cell value in the pivot array
  const getCellValue = (r: typeof rowStructures[0], monthKey: string) => {
    const row = pivotData.find(p => 
      p.jenis === r.jenis && 
      p.subjenis === r.subjenis && 
      (p.kategori === r.kategori || (p.kategori === "" && !r.kategori))
    );
    if (!row) return 0;
    return (row as any)[monthKey] || 0;
  };

  // CSV/Excel Export function
  const handleExportExcel = () => {
    const kuaName = kuas.find(k => k.id_kua.toString() === selectedKuaId)?.nama_kua || selectedKuaId;
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // CSV Header info
    csvContent += `SISTEM INFORMASI BLANKO NIKAH (SIBN) KABUPATEN TANGERANG\r\n`;
    csvContent += `Laporan Persediaan Blanko Nikah KUA ${kuaName} - Tahun ${selectedYear}\r\n\r\n`;
    csvContent += "Tipe Rincian Laporan,Jan,Feb,Mar,Apr,Mei,Jun,Jul,Ags,Sep,Okt,Nov,Des,Jumlah\r\n";

    rowStructures.forEach(r => {
      const cells = [
        `"${r.label}"`,
        getCellValue(r, "Jan"),
        getCellValue(r, "Feb"),
        getCellValue(r, "Mar"),
        getCellValue(r, "Apr"),
        getCellValue(r, "Mei"),
        getCellValue(r, "Jun"),
        getCellValue(r, "Jul"),
        getCellValue(r, "Ags"),
        getCellValue(r, "Sep"),
        getCellValue(r, "Okt"),
        getCellValue(r, "Nov"),
        getCellValue(r, "Des"),
        getCellValue(r, "Jumlah")
      ];
      csvContent += cells.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SIBN_Laporan_Stok_${kuaName.replace(/\s+/g, "_")}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const currentKuaDetails = kuas.find(k => k.id_kua.toString() === selectedKuaId);

  return (
    <div className="space-y-6 animate-fadeIn" id="laporan-stok-container">
      
      {/* 1. Header Toolbar Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel no-print" id="laporan-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Laporan & <span className="text-gold-gradient">Persediaan Stok Blanko</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Rekapitulasi tahunan sirkulasi blanko nikah (Masuk, Keluar, Rusak) per KUA
          </p>
        </div>

        {/* Buttons / Actions */}
        {user.level !== "Viewer" && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleOpenInputForm(false)}
              className="bg-gold-gradient hover:brightness-110 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
              id="new-report-btn"
            >
              <Plus className="w-4 h-4" />
              Input Baru
            </button>
            <button
              onClick={() => handleOpenInputForm(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              id="edit-report-btn"
            >
              <Edit className="w-4 h-4" />
              Edit Data Bulanan
            </button>
          </div>
        )}
      </div>

      {/* 2. Success/Error Messages */}
      {success && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg no-print">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg no-print">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 3. Filter Sidebar / Card Top (No Print) */}
      <div className="bg-slate-800/40 border border-gray-700/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 no-print" id="laporan-filter-panel">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* KUA selector */}
          <div className="flex flex-col w-full md:w-64">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">KUA Kecamatan</span>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
              <select
                value={selectedKuaId}
                onChange={(e) => setSelectedKuaId(e.target.value)}
                disabled={user.level === "Operator KUA" && !!user.id_kua}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-75"
                id="filter-kua-select"
              >
                {kuas.map(k => (
                  <option key={k.id_kua} value={k.id_kua}>KUA Kecamatan {k.nama_kua}</option>
                ))}
              </select>
              {user.level === "Operator KUA" && (
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
              )}
            </div>
          </div>

          {/* Year selector */}
          <div className="flex flex-col w-full md:w-36">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tahun Laporan</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-gray-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                id="filter-year-select"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Print & Export tools */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            className="p-2.5 bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Unduh format CSV/Excel"
            id="export-excel-btn"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            onClick={handlePrint}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm border border-gray-800 transition-colors cursor-pointer"
            title="Cetak cetakan resmi"
            id="print-table-btn"
          >
            <Printer className="w-4 h-4 text-amber-500" />
            Cetak Print
          </button>
        </div>
      </div>

      {/* 4. Official Print Header (Visible ONLY when printing) */}
      <div className="print-only text-center space-y-2 pb-6 border-b-2 border-black" id="print-official-header">
        <h2 className="text-lg font-bold">KEMENTERIAN AGAMA KABUPATEN TANGERANG</h2>
        <h3 className="text-md font-bold uppercase">MONITORING PERSEDIAAN BLANKO NIKAH - TAHUN {selectedYear}</h3>
        <p className="text-xs">KUA Kecamatan: {currentKuaDetails?.nama_kua || "-"} | Kepala KUA: {currentKuaDetails?.kepala_kua || "-"}</p>
        <p className="text-[10px] text-gray-500">Alamat: {currentKuaDetails?.alamat || "-"}</p>
      </div>

      {/* 5. Main Pivot Table Card */}
      <div className="bg-white rounded-2xl p-6 shadow-md print-card" id="laporan-main-table-card">
        
        {/* Table Title Block (Hidden on Print because of official header) */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-3 no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Laporan Persediaan KUA Kecamatan {currentKuaDetails?.nama_kua}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">Kepala KUA: <span className="font-semibold text-slate-700">{currentKuaDetails?.kepala_kua || "-"}</span></p>
          </div>
          <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full uppercase mt-2 md:mt-0">
            Sistem SIBN Terverifikasi
          </span>
        </div>

        {/* Pivot Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-600 border border-gray-200">
            <thead>
              <tr className="bg-slate-100 border-b border-gray-300 text-slate-700 font-bold">
                <th className="py-2.5 px-3 border border-gray-200 font-bold max-w-sm">Rincian Peristiwa / Klasifikasi Blanko</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Jan</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Feb</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Mar</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Apr</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Mei</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Jun</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Jul</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Ags</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Sep</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Okt</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Nov</th>
                <th className="py-2.5 px-1 border border-gray-200 text-center font-bold">Des</th>
                <th className="py-2.5 px-2 border border-gray-300 text-center font-bold bg-amber-50 text-amber-900">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center py-20 text-gray-400 font-medium">
                    <RefreshCw className="animate-spin text-amber-500 w-8 h-8 mx-auto mb-2" />
                    Memuat data sirkulasi stok...
                  </td>
                </tr>
              ) : (
                rowStructures.map((r, idx) => {
                  const isMasuk = r.jenis === "Masuk";
                  const isKeluar = r.jenis === "Keluar";
                  const isRusak = r.jenis === "Rusak";
                  
                  return (
                    <tr 
                      key={idx} 
                      className={`border-b border-gray-200 hover:bg-slate-50 transition-colors ${
                        isMasuk ? "bg-emerald-50/20" : isRusak ? "bg-rose-50/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3 border border-gray-200 font-medium text-slate-800">
                        {r.label}
                      </td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Jan")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Feb")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Mar")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Apr")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Mei")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Jun")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Jul")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Ags")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Sep")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Okt")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Nov")}</td>
                      <td className="py-2 px-1 border border-gray-200 text-center font-semibold">{getCellValue(r, "Des")}</td>
                      <td className="py-2 px-2 border border-gray-300 text-center font-extrabold bg-amber-50 text-slate-800">
                        {getCellValue(r, "Jumlah")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-[10px] text-gray-500 no-print">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-200 rounded"></span> Masuk (Penerimaan Stok)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-white border border-gray-200 rounded"></span> Keluar (Pendistribusian Peristiwa)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-50 border border-rose-100 rounded"></span> Rusak (Sirkulasi Rusak/Batal)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-50 border border-amber-100 rounded"></span> Total Jumlah Akumulasi</span>
        </div>

        {/* 6. Official Print Signatures (Visible ONLY when printing) */}
        <div className="print-only mt-12" id="print-signatures">
          <div className="grid grid-cols-2 text-center text-xs">
            <div className="space-y-16">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala KUA Kecamatan {currentKuaDetails?.nama_kua || "-"}</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{currentKuaDetails?.kepala_kua || ".................................................."}</p>
                <p>NIP. {currentKuaDetails?.nip_kepala || ".................................................."}</p>
              </div>
            </div>
            <div className="space-y-16">
              <div>
                <p>Tangerang, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="font-bold">Pengelola Data Stok</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{currentKuaDetails?.pengelola_stok || ".................................................."}</p>
                <p>NIP. {currentKuaDetails?.nip_pengelola || ".................................................."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================
          BATCH DATA ENTRY MODAL (Input Baru / Edit Bulanan)
          ======================================================== */}
      {isInputMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="laporan-input-modal">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-800 p-5 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="text-amber-500 w-5 h-5" />
                  {isEditMode ? "Perbarui (Edit) Laporan Bulanan" : "Input Baru Laporan Bulanan"}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Mengisi sirkulasi sediaan blanko nikah KUA Kecamatan {currentKuaDetails?.nama_kua}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsInputMode(false)} 
                className="text-gray-400 hover:text-white font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            {/* Selection bar for month/year of input */}
            <div className="bg-slate-800/50 p-4 border-b border-gray-800/80 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 font-semibold">Bulan Pengisian:</span>
                <select 
                  value={inputMonth} 
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setInputMonth(newMonth);
                    if (isEditMode) {
                      loadEditData(newMonth, inputYear);
                    }
                  }}
                  disabled={isEditMode && user.level !== "Admin"} // Cannot change month once in edit fetch mode unless Admin
                  className={`bg-slate-900 border border-gray-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer focus:outline-none ${isEditMode && user.level === "Admin" ? "border-amber-500 text-amber-400" : ""}`}
                >
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 font-semibold">Tahun:</span>
                <select 
                  value={inputYear} 
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value, 10);
                    setInputYear(newYear);
                    if (isEditMode) {
                      loadEditData(inputMonth, newYear);
                    }
                  }}
                  disabled={isEditMode && user.level !== "Admin"}
                  className={`bg-slate-900 border border-gray-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer focus:outline-none ${isEditMode && user.level === "Admin" ? "border-amber-500 text-amber-400" : ""}`}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {isEditMode ? (
                <div className="flex items-center gap-2 ml-auto">
                  {user.level === "Admin" && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                      Admin: Bebas Pilih Bulan/Tahun Edit
                    </span>
                  )}
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-bold uppercase">
                    Mode Edit
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenInputForm(false)}
                  className="ml-auto text-[10px] bg-slate-800 text-amber-500 font-bold px-3 py-1 rounded border border-gray-700 hover:bg-slate-700"
                >
                  Reset / Kosongkan Form
                </button>
              )}
            </div>

            {/* Inner Form content */}
            <form onSubmit={handleSaveStok} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {lockStatus.isLocked && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed font-semibold shadow-lg">
                  <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-rose-500 font-extrabold uppercase block mb-1">Data Terkunci (Batas Waktu Pengisian Habis)</span>
                    {lockStatus.message}
                  </div>
                </div>
              )}

              {formError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-lg">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              {/* Grid split by categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. SECTION MASUK */}
                <div className="space-y-4 bg-slate-800/25 p-4 rounded-xl border border-emerald-500/10">
                  <h4 className="font-bold text-emerald-400 text-xs border-b border-emerald-500/20 pb-2 flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                    1. Penerimaan Masuk
                  </h4>
                  {rowStructures.filter(r => r.jenis === "Masuk").map(r => {
                    const key = getRowKey(r.jenis, r.subjenis, r.kategori);
                    const isNA = key === "Masuk_NA_";
                    return (
                      <div key={key} className="space-y-1">
                        <label className="block text-[11px] text-gray-300 font-medium">
                          {r.label}
                          {isNA && (
                            <span className="text-[10px] text-amber-500 font-bold ml-1.5 block sm:inline">(Otomatis 2x Model N)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={inputValues[key] ?? 0}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          disabled={lockStatus.isLocked || isNA}
                          className={`w-full bg-slate-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs text-right font-mono focus:outline-none focus:border-amber-500 font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${isNA ? "bg-slate-950/50 border-amber-500/20 text-amber-500/90" : ""}`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 2. SECTION KELUAR */}
                <div className="space-y-4 bg-slate-800/25 p-4 rounded-xl border border-gray-700/40">
                  <h4 className="font-bold text-amber-400 text-xs border-b border-gray-700 pb-2 flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span>
                    2. Pendistribusian Keluar
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                    {rowStructures.filter(r => r.jenis === "Keluar").map(r => {
                      const key = getRowKey(r.jenis, r.subjenis, r.kategori);
                      return (
                        <div key={key} className="space-y-1">
                          <label className="block text-[11px] text-gray-300 font-medium">{r.label}</label>
                          <input
                            type="text"
                            value={inputValues[key] ?? 0}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            disabled={lockStatus.isLocked}
                            className="w-full bg-slate-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs text-right font-mono focus:outline-none focus:border-amber-500 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. SECTION RUSAK */}
                <div className="space-y-4 bg-slate-800/25 p-4 rounded-xl border border-rose-500/10">
                  <h4 className="font-bold text-rose-400 text-xs border-b border-rose-500/20 pb-2 flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 bg-rose-500 rounded-full inline-block"></span>
                    3. Sirkulasi Rusak
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                    {rowStructures.filter(r => r.jenis === "Rusak").map(r => {
                      const key = getRowKey(r.jenis, r.subjenis, r.kategori);
                      return (
                        <div key={key} className="space-y-1">
                          <label className="block text-[11px] text-gray-300 font-medium">{r.label}</label>
                          <input
                            type="text"
                            value={inputValues[key] ?? 0}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            disabled={lockStatus.isLocked}
                            className="w-full bg-slate-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs text-right font-mono focus:outline-none focus:border-amber-500 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Form Footer */}
              <div className="bg-slate-800 -mx-6 -mb-6 p-4 mt-6 flex justify-end gap-2 border-t border-gray-800">
                <button 
                  type="button"
                  onClick={() => setIsInputMode(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Tutup
                </button>
                <button 
                  type="submit"
                  disabled={lockStatus.isLocked}
                  className={`${
                    lockStatus.isLocked 
                      ? "bg-slate-700 text-gray-500 border border-slate-600 cursor-not-allowed" 
                      : "bg-gold-gradient hover:brightness-110 text-slate-950 cursor-pointer"
                  } text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1`}
                >
                  <Save className="w-4 h-4" />
                  {lockStatus.isLocked ? "Terkunci (Hanya Admin)" : "Simpan Laporan Bulanan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
