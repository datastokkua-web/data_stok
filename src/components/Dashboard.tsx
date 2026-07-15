import React, { useState, useEffect } from "react";
import { DashboardStats, User } from "../types";
import { 
  Building2, 
  FileCheck, 
  FileWarning, 
  UploadCloud, 
  AlertTriangle, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  PieChart as PieIcon,
  RefreshCw,
  Bell
} from "lucide-react";

interface DashboardProps {
  user: User;
  token: string;
  onNavigate: (view: string) => void;
  isDarkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, token, onNavigate, isDarkMode }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>("Juli");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeModal, setActiveModal] = useState<"belum_input" | "belum_upload" | null>(null);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const years = [2024, 2025, 2026, 2027];

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/stats?bulan=${selectedMonth}&tahun=${selectedYear}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Gagal mengambil data statistik dashboard.");
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Gagal mengambil statistik.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4" id="dashboard-loading">
        <RefreshCw className="animate-spin text-amber-500 w-12 h-12" />
        <p className="text-gray-400 font-medium">Memuat statistik SIBN...</p>
      </div>
    );
  }

  const completionPercent = stats 
    ? Math.round((stats.sudahInputCount / stats.totalKua) * 100) 
    : 0;

  const pdfPercent = stats
    ? Math.round((stats.sudahUploadCount / stats.totalKua) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn" id="dashboard-container">
      {/* 1. Welcoming & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel" id="dashboard-header-panel">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight" id="dashboard-title">
            Selamat Datang, <span className="text-gold-gradient">{user.nama}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1" id="dashboard-subtitle">
            Memonitor Persediaan Blanko Nikah Kabupaten Tangerang ({user.level})
          </p>
        </div>

        {/* Dynamic Filters */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2 rounded-xl border border-gray-700" id="dashboard-filters">
          <Calendar className="text-amber-500 w-4 h-4 ml-2" />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer pr-2 border-r border-gray-700"
            id="month-select"
          >
            {months.map(m => (
              <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer pr-2"
            id="year-select"
          >
            {years.map(y => (
              <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
            ))}
          </select>
          <button 
            onClick={fetchStats} 
            className="p-1 text-amber-500 hover:text-white transition-colors"
            title="Refresh Data"
            id="refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Notification Banner */}
      {stats && (stats.belumInputCount > 0 || stats.belumUploadCount > 0) && (
        <div 
          className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl flex items-center justify-between shadow-lg cursor-pointer hover:bg-amber-500/15 transition-all"
          onClick={() => setActiveModal("belum_input")}
          id="dashboard-notif-banner"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
            <div className="text-sm">
              <span className="font-bold">Notifikasi Sistem:</span> Ada{" "}
              <span className="font-bold text-white underline">{stats.belumInputCount} KUA</span> belum mengisi laporan dan{" "}
              <span className="font-bold text-white underline">{stats.belumUploadCount} KUA</span> belum mengunggah PDF laporan bulan <span className="font-bold text-white">{selectedMonth}</span>.
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-400 font-medium hover:underline">
            Lihat Detail <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* 3. Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="dashboard-cards-grid">
        {/* Card 1: Total KUA */}
        <div className="group bg-white rounded-2xl p-5 shadow-md border border-gray-100 border-b-4 border-b-amber-500 flex flex-col justify-between transition-all duration-500 ease-out transform hover:scale-[1.05] hover:-translate-y-2 hover:border-amber-400 hover:shadow-[0_20px_30px_rgba(245,158,11,0.25)]" id="card-total-kua">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total KUA</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{stats?.totalKua || 29}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-amber-500/20 group-hover:rotate-6">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Kecamatan Aktif</span>
            <span className="font-bold text-slate-800">100%</span>
          </div>
        </div>

        {/* Card 2: Sudah Input */}
        <div className="group bg-white rounded-2xl p-5 shadow-md border border-gray-100 border-b-4 border-b-emerald-500 flex flex-col justify-between transition-all duration-500 ease-out transform hover:scale-[1.05] hover:-translate-y-2 hover:border-emerald-400 hover:shadow-[0_20px_30px_rgba(16,185,129,0.25)]" id="card-sudah-input">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Sudah Input</p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{stats?.sudahInputCount || 0} KUA</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:-rotate-6">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${completionPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>Kelengkapan Laporan</span>
              <span className="font-bold text-emerald-600">{completionPercent}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Belum Input */}
        <div 
          className="group bg-white rounded-2xl p-5 shadow-md border border-gray-100 border-b-4 border-b-rose-500 flex flex-col justify-between transition-all duration-500 ease-out transform hover:scale-[1.05] hover:-translate-y-2 hover:border-rose-400 hover:shadow-[0_20px_30px_rgba(244,63,94,0.25)] cursor-pointer"
          onClick={() => setActiveModal("belum_input")}
          title="Klik untuk melihat KUA yang belum input"
          id="card-belum-input"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Belum Input</p>
              <h3 className="text-3xl font-extrabold text-rose-600 mt-2">{stats?.belumInputCount || 0} KUA</h3>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-rose-500/20 group-hover:rotate-6 animate-pulse">
              <FileWarning className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-rose-500 font-medium">
            <span>Klik lihat daftar</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-2" />
          </div>
        </div>

        {/* Card 4: Sudah Upload PDF */}
        <div className="group bg-white rounded-2xl p-5 shadow-md border border-gray-100 border-b-4 border-b-amber-600 flex flex-col justify-between transition-all duration-500 ease-out transform hover:scale-[1.05] hover:-translate-y-2 hover:border-amber-500 hover:shadow-[0_20px_30px_rgba(217,119,6,0.25)]" id="card-sudah-pdf">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Sudah Upload PDF</p>
              <h3 className="text-3xl font-extrabold text-amber-700 mt-2">{stats?.sudahUploadCount || 0}</h3>
            </div>
            <div className="p-2 bg-amber-600/10 text-amber-700 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-amber-600/20 group-hover:-rotate-6">
              <UploadCloud className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-600 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pdfPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>PDF Terunggah</span>
              <span className="font-bold text-amber-600">{pdfPercent}%</span>
            </div>
          </div>
        </div>

        {/* Card 5: Belum Upload PDF */}
        <div 
          className="group bg-white rounded-2xl p-5 shadow-md border border-gray-100 border-b-4 border-b-yellow-500 flex flex-col justify-between transition-all duration-500 ease-out transform hover:scale-[1.05] hover:-translate-y-2 hover:border-yellow-400 hover:shadow-[0_20px_30px_rgba(234,179,8,0.25)] cursor-pointer"
          onClick={() => setActiveModal("belum_upload")}
          title="Klik untuk melihat KUA yang belum upload PDF"
          id="card-belum-pdf"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Belum Upload PDF</p>
              <h3 className="text-3xl font-extrabold text-yellow-600 mt-2">{stats?.belumUploadCount || 0}</h3>
            </div>
            <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-yellow-500/20 group-hover:rotate-6">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-yellow-600 font-medium">
            <span>Klik lihat daftar</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-2" />
          </div>
        </div>
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-panel">
        
        {/* Chart 1: Monthly trend (Bar Chart style via custom responsive vector drawings) */}
        <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/10 glass-panel flex flex-col transition-all duration-300 ease-out hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1" id="chart-trend-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-amber-500 w-5 h-5" />
                Tren Distribusi Bulanan Tahun {selectedYear}
              </h3>
              <p className="text-gray-400 text-xs mt-1">Akumulasi stok Masuk, Keluar, dan Rusak di seluruh KUA</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span> Masuk
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-3 h-3 bg-amber-500 rounded-full inline-block"></span> Keluar
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-3 h-3 bg-rose-500 rounded-full inline-block"></span> Rusak
              </span>
            </div>
          </div>

          {/* SVG Vector bar chart */}
          <div className="h-64 mt-4 w-full relative flex items-end justify-between px-2 pb-6 border-b border-gray-800" id="svg-trend-chart">
            {stats && stats.chartData ? (
              stats.chartData.map((d, idx) => {
                // Find max for scaling
                const maxVal = Math.max(...stats.chartData.map(v => Math.max(v.Masuk, v.Keluar, v.Rusak, 1)));
                const scale = (val: number) => (val / maxVal) * 160; // Max height is 160px

                return (
                  <div key={d.name} className="flex flex-col items-center flex-1 mx-1 group" id={`trend-month-${idx}`}>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-24 bg-slate-800 border border-amber-500/30 p-2.5 rounded-lg shadow-2xl text-[10px] text-gray-200 hidden group-hover:flex flex-col gap-1 z-30 pointer-events-none transition-all">
                      <span className="font-bold text-white text-center border-b border-gray-700 pb-1 mb-1">{d.name}</span>
                      <span className="text-emerald-400">Masuk: <b className="text-white">{d.Masuk}</b></span>
                      <span className="text-amber-400">Keluar: <b className="text-white">{d.Keluar}</b></span>
                      <span className="text-rose-400">Rusak: <b className="text-white">{d.Rusak}</b></span>
                    </div>

                    {/* Bars stacked next to each other */}
                    <div className="flex items-end gap-1 h-40">
                      <div 
                        className="w-2.5 bg-emerald-500 rounded-t-sm shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:brightness-125 transition-all" 
                        style={{ height: `${scale(d.Masuk)}px` }}
                      />
                      <div 
                        className="w-2.5 bg-amber-500 rounded-t-sm shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:brightness-125 transition-all" 
                        style={{ height: `${scale(d.Keluar)}px` }}
                      />
                      <div 
                        className="w-2.5 bg-rose-500 rounded-t-sm shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:brightness-125 transition-all" 
                        style={{ height: `${scale(d.Rusak)}px` }}
                      />
                    </div>
                    
                    {/* Month Label */}
                    <span className="text-[10px] text-gray-500 font-medium mt-2 select-none">
                      {d.name.substring(0, 3)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Tidak ada data tren</div>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 px-1">
            <span>Volume Rendah</span>
            <span>Volume Maksimum Sistem</span>
          </div>
        </div>

        {/* Chart 2: Completeness percentage (Radial Pie Chart style) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-amber-500/10 glass-panel flex flex-col justify-between transition-all duration-300 ease-out hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1" id="chart-completeness-card">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PieIcon className="text-amber-500 w-5 h-5" />
              Kelengkapan Laporan
            </h3>
            <p className="text-gray-400 text-xs mt-1">Rasio KUA yang sudah mengisi laporan bulan {selectedMonth} {selectedYear}</p>
          </div>

          <div className="flex flex-col items-center justify-center my-6" id="completeness-radial-box">
            {/* Simple CSS Circular Progress */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="text-slate-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="text-amber-500"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - completionPercent / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-extrabold text-white">{completionPercent}%</span>
                <span className="text-[10px] text-amber-400 font-bold tracking-wider uppercase mt-1">Sudah Diisi</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-lg border border-gray-800">
              <span className="text-gray-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Sudah Mengisi
              </span>
              <span className="font-bold text-white">{stats?.sudahInputCount || 0} KUA</span>
            </div>
            <div className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-lg border border-gray-800">
              <span className="text-gray-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-700 rounded-full"></span> Belum Mengisi
              </span>
              <span className="font-bold text-rose-500">{stats?.belumInputCount || 0} KUA</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Monthly Completeness Progress Bars */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-amber-500/10 glass-panel flex flex-col transition-all duration-300 ease-out hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5" id="monthly-completeness-panel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="text-amber-500 w-5 h-5" />
              Kelengkapan Laporan Bulanan (Tahun {selectedYear})
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Visualisasi persentase KUA yang sudah melengkapi input laporan per bulan. Klik bulan untuk memfilter dashboard secara interaktif.
            </p>
          </div>
          <div className="text-xs text-gray-400">
            Total KUA Aktif: <span className="font-bold text-white">{stats?.totalKua || 0} KUA</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="monthly-progress-grid">
          {(stats?.monthlyCompleteness || months.map(m => {
            const isCurrent = m === selectedMonth;
            return {
              month: m,
              count: isCurrent ? (stats?.sudahInputCount || 0) : 0,
              percentage: isCurrent ? completionPercent : 0
            };
          })).map((item) => {
            const isSelected = item.month === selectedMonth;
            
            // Determine progress bar and text color based on completeness
            let progressColor = "bg-rose-500";
            let textColor = "text-rose-400";
            if (item.percentage === 100) {
              progressColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
              textColor = "text-emerald-400";
            } else if (item.percentage >= 75) {
              progressColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
              textColor = "text-amber-400";
            } else if (item.percentage >= 50) {
              progressColor = "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]";
              textColor = "text-yellow-400";
            }

            return (
              <div 
                key={item.month}
                onClick={() => setSelectedMonth(item.month)}
                className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer select-none flex flex-col justify-between ${
                  isSelected 
                    ? "bg-slate-800/80 border-amber-500/50 shadow-md shadow-amber-500/10 scale-[1.02]" 
                    : "bg-slate-800/20 border-gray-800/40 hover:bg-slate-800/40 hover:border-gray-700/60 hover:scale-[1.01]"
                }`}
                id={`progress-month-${item.month}`}
                title={`Klik untuk memfilter bulan ${item.month}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold text-sm ${isSelected ? "text-amber-400" : "text-gray-200"}`}>
                    {item.month}
                  </span>
                  <span className={`text-xs font-extrabold ${textColor}`}>
                    {item.percentage}%
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                  <span>{item.count} / {stats?.totalKua || 0} KUA</span>
                  {isSelected && (
                    <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold animate-pulse">
                      Aktif
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Subjenis Stats Table Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-md transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1" id="subjenis-breakdown-card">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileCheck className="text-amber-600 w-5 h-5" />
          Rincian Akumulasi Blanko Nikah (Bulan {selectedMonth} {selectedYear})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold text-slate-700">Tipe Blanko</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-center">Jumlah Masuk</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-center">Jumlah Keluar</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-center">Jumlah Rusak</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-center">Persediaan Bersih</th>
              </tr>
            </thead>
            <tbody>
              {["NB", "N", "NA"].map(sub => {
                const masuk = stats?.subjenisData?.find(r => r.subjenis === sub && r.jenis === "Masuk")?.total || 0;
                const keluar = stats?.subjenisData?.find(r => r.subjenis === sub && r.jenis === "Keluar")?.total || 0;
                const rusak = stats?.subjenisData?.find(r => r.subjenis === sub && r.jenis === "Rusak")?.total || 0;
                const sisa = masuk - keluar - rusak;

                return (
                  <tr key={sub} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      Model {sub} <span className="text-xs font-normal text-gray-400">({sub === "NB" ? "Nikah Beralamat" : sub === "N" ? "Nikah Standar" : "Nikah Campuran"})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{masuk}</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-semibold">{keluar}</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-semibold">{rusak}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sisa >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {sisa}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL DETAILED UNINPUT & UNUPLOADED KUA LISTS (Card Click)
          ======================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="dashboard-modal-overlay">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-800 p-5 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {activeModal === "belum_input" ? (
                    <>
                      <FileWarning className="text-rose-500 w-5 h-5 animate-pulse" />
                      Daftar Belum Input Laporan ({selectedMonth} {selectedYear})
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="text-yellow-500 w-5 h-5" />
                      Daftar Belum Upload PDF ({selectedMonth} {selectedYear})
                    </>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Detail KUA Kabupaten Tangerang yang belum menyelesaikan pengisian data</p>
              </div>
              <button 
                onClick={() => setActiveModal(null)} 
                className="text-gray-400 hover:text-white font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* List */}
              {activeModal === "belum_input" ? (
                stats && stats.unresolvedUninput && stats.unresolvedUninput.length > 0 ? (
                  <div className="space-y-3">
                    {stats.unresolvedUninput.map((k, idx) => (
                      <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between md:flex-row md:items-center gap-2">
                        <div>
                          <h4 className="font-bold text-white">KUA Kecamatan {k.nama_kua}</h4>
                          <p className="text-[11px] text-gray-400 mt-1">Missing reports for {selectedYear}:</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {k.missingMonths.map(m => (
                              <span key={m} className={`px-2 py-0.5 rounded text-[10px] font-bold ${m === selectedMonth ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-slate-700 text-gray-300"}`}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        {user.level === "Admin" && (
                          <button 
                            onClick={() => {
                              setActiveModal(null);
                              onNavigate("laporan");
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer self-start md:self-auto"
                          >
                            Input Sekarang <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center text-sm py-8">Seluruh KUA sudah menyelesaikan pengisian laporan!</p>
                )
              ) : (
                stats && stats.unresolvedBelumUpload && stats.unresolvedBelumUpload.length > 0 ? (
                  <div className="space-y-3">
                    {stats.unresolvedBelumUpload.map((k, idx) => (
                      <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between md:flex-row md:items-center gap-2">
                        <div>
                          <h4 className="font-bold text-white">KUA Kecamatan {k.nama_kua}</h4>
                          <p className="text-[11px] text-gray-400 mt-1">Missing PDFs for {selectedYear}:</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {k.missingMonths.map(m => (
                              <span key={m} className={`px-2 py-0.5 rounded text-[10px] font-bold ${m === selectedMonth ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-slate-700 text-gray-300"}`}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        {(user.level === "Admin" || (user.level === "Operator KUA" && user.nama_kua === k.nama_kua)) && (
                          <button 
                            onClick={() => {
                              setActiveModal(null);
                              onNavigate("pdf");
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer self-start md:self-auto"
                          >
                            Upload PDF <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center text-sm py-8">Seluruh KUA sudah menyelesaikan unggah PDF!</p>
                )
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-800 p-4 border-t border-gray-800 flex justify-end">
              <button 
                onClick={() => setActiveModal(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
