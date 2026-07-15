import React, { useState, useEffect } from "react";
import { User, ActivityLog } from "../types";
import { 
  History, 
  Search, 
  RefreshCw, 
  Clock, 
  User as UserIcon, 
  ShieldAlert,
  Info
} from "lucide-react";

interface LogsProps {
  user: User;
  token: string;
}

export const ActivityLogs: React.FC<LogsProps> = ({ user, token }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/logs", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Gagal memuat log aktivitas sistem.");
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.level === "Admin") {
      fetchLogs();
    }
  }, []);

  if (user.level !== "Admin") {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="font-bold text-lg">Akses Terbatas</h3>
          <p className="text-sm mt-1">Hanya Administrator yang memiliki akses untuk meninjau log aktivitas (audit trail) sistem.</p>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.aktivitas.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.detail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn" id="logs-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-amber-500/20 glass-panel" id="logs-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Log Aktivitas <span className="text-gold-gradient">Sistem (Audit Trail)</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Riwayat log audit real-time pengisian data, berkas unggahan, dan otentikasi login
          </p>
        </div>

        <button 
          onClick={fetchLogs}
          className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Log
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl p-6 shadow-md" id="logs-card">
        
        {/* Filter and stats */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-slate-600 text-sm">
            Menampilkan <span className="font-bold text-slate-800">{filteredLogs.length}</span> aktivitas log audit terakhir
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
            <input 
              type="text" 
              placeholder="Cari kata kunci aktivitas, operator..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Logs Timeline */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2" id="logs-timeline-list">
          {loading ? (
            <div className="text-center py-20 text-gray-400">
              <RefreshCw className="animate-spin text-amber-500 w-8 h-8 mx-auto mb-2" />
              Memuat log audit...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              Tidak ada riwayat aktivitas log audit yang terekam.
            </div>
          ) : (
            filteredLogs.map((log) => {
              // Custom color coding based on action types
              const isLogin = log.aktivitas === "Login";
              const isDelete = log.aktivitas.toLowerCase().includes("hapus");
              const isAdd = log.aktivitas.toLowerCase().includes("tambah") || log.aktivitas.toLowerCase().includes("input");
              const isBackup = log.aktivitas.toLowerCase().includes("backup") || log.aktivitas.toLowerCase().includes("restore");

              return (
                <div 
                  key={log.id} 
                  className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all hover:translate-x-1 ${
                    isLogin 
                      ? "bg-blue-50/50 border-blue-100" 
                      : isDelete 
                        ? "bg-rose-50/50 border-rose-100" 
                        : isAdd 
                          ? "bg-emerald-50/50 border-emerald-100"
                          : isBackup
                            ? "bg-purple-50/50 border-purple-100"
                            : "bg-slate-50 border-gray-100"
                  }`}
                >
                  {/* Indicator Icon */}
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isLogin 
                      ? "bg-blue-500/10 text-blue-600" 
                      : isDelete 
                        ? "bg-rose-500/10 text-rose-600" 
                        : isAdd 
                          ? "bg-emerald-500/10 text-emerald-600"
                          : isBackup
                            ? "bg-purple-500/10 text-purple-600"
                            : "bg-gray-500/10 text-gray-600"
                  }`}>
                    <History className="w-5 h-5" />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-800 text-sm">
                        {log.aktivitas}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {log.detail}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        Aktor: {log.username}
                      </span>
                      <span>ID User: {log.id_user || "System"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
