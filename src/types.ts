export interface User {
  id_user: number;
  username: string;
  nama: string;
  level: "Admin" | "Operator KUA" | "Viewer";
  status: "Aktif" | "Nonaktif";
  id_kua: number | null;
  nama_kua?: string;
  csrfToken: string;
  last_login?: string;
  ganti_password?: number;
}

export interface KUA {
  id_kua: number;
  nama_kua: string;
  alamat: string;
  kepala_kua: string;
  nip_kepala?: string;
  pengelola_stok?: string;
  nip_pengelola?: string;
  operator: string;
  aktif: number;
}

export interface PivotRow {
  jenis: "Masuk" | "Keluar" | "Rusak";
  subjenis: "NB" | "N" | "NA";
  kategori: "" | "Nikah" | "Isbat" | "Duplikat";
  Jan: number;
  Feb: number;
  Mar: number;
  Apr: number;
  Mei: number;
  Jun: number;
  Jul: number;
  Ags: number;
  Sep: number;
  Okt: number;
  Nov: number;
  Des: number;
  Jumlah: number;
}

export interface PdfUpload {
  id: number;
  id_kua: number;
  nama_kua?: string;
  bulan: string;
  tahun: number;
  nama_file: string;
  tanggal_upload: string;
}

export interface ActivityLog {
  id: number;
  id_user: number | null;
  username: string;
  aktivitas: string;
  detail: string;
  timestamp: string;
}

export interface DashboardStats {
  totalKua: number;
  sudahInputCount: number;
  belumInputCount: number;
  sudahUploadCount: number;
  belumUploadCount: number;
  belumInputKuas: { id_kua: number; nama_kua: string }[];
  belumUploadKuas: { id_kua: number; nama_kua: string }[];
  unresolvedUninput: { nama_kua: string; missingMonths: string[] }[];
  unresolvedBelumUpload: { nama_kua: string; missingMonths: string[] }[];
  chartData: {
    name: string;
    Masuk: number;
    Keluar: number;
    Rusak: number;
  }[];
  subjenisData: {
    subjenis: string;
    jenis: string;
    total: number;
  }[];
  monthlyCompleteness?: {
    month: string;
    count: number;
    percentage: number;
  }[];
}
