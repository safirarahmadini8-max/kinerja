export interface DailyReport {
  id?: string;
  tanggal: string; // Date (YYYY-MM-DD)
  jam: string;     // Time (HH:mm)
  namaTugas: string;
  deskripsiProgres: string;
  linkFoto: string;
  fileIdFoto?: string;
  namaKaryawan: string;
  emailKaryawan: string;
  status: 'Selesai' | 'Sedang Berjalan' | 'Menunggu Review';
}

export interface WorkspaceConfig {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  folderId: string | null;
  isInitializing: boolean;
  error: string | null;
}
