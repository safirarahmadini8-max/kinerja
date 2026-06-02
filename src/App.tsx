import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './auth';
import { findOrCreateDatabase, getReports } from './lib/sheetsService';
import { WorkspaceConfig, DailyReport } from './types';
import StatsDashboard from './components/StatsDashboard';
import ReportForm from './components/ReportForm';
import ReportHistory from './components/ReportHistory';
import { FileSpreadsheet, LogOut, Database, User as UserIcon, Link2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Database Connection State
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>({
    spreadsheetId: null,
    spreadsheetUrl: null,
    folderId: null,
    isInitializing: true,
    error: null,
  });

  // Reports state & triggers
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [customSheetId, setCustomSheetId] = useState<string>('');
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // 1. Initialize Auth on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setAuthChecking(false);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Initialize Database and folders once authenticated
  useEffect(() => {
    if (!currentUser || !accessToken) return;

    const setupDatabase = async () => {
      setWorkspaceConfig((prev) => ({ ...prev, isInitializing: true, error: null }));
      
      // Check if user has a custom spreadsheet override in localStorage
      const cachedCustomId = localStorage.getItem(`custom_sheet_id_${currentUser.email}`);
      
      try {
        if (cachedCustomId) {
          // Initialize with custom ID
          setWorkspaceConfig({
            spreadsheetId: cachedCustomId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cachedCustomId}/edit`,
            folderId: localStorage.getItem(`custom_folder_id_${currentUser.email}`) || null,
            isInitializing: false,
            error: null,
          });
          setCustomSheetId(cachedCustomId);
        } else {
          // Find or create automatically
          const config = await findOrCreateDatabase(accessToken);
          setWorkspaceConfig(config);
        }
      } catch (err: any) {
        setWorkspaceConfig((prev) => ({
          ...prev,
          isInitializing: false,
          error: err.message || 'Gagal tersambung ke spreadsheet database.',
        }));
      }
    };

    setupDatabase();
  }, [currentUser, accessToken]);

  // 3. Load reports when spreadsheet connection is ready
  const fetchReportData = async () => {
    if (!accessToken || !workspaceConfig.spreadsheetId) return;

    setIsLoadingReports(true);
    try {
      const data = await getReports(accessToken, workspaceConfig.spreadsheetId);
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    if (workspaceConfig.spreadsheetId && accessToken) {
      fetchReportData();
    }
  }, [workspaceConfig.spreadsheetId, accessToken]);

  // Actions
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err) {
      console.error('Login action failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
      await logout();
      setCurrentUser(null);
      setAccessToken(null);
      setReports([]);
      setWorkspaceConfig({
        spreadsheetId: null,
        spreadsheetUrl: null,
        folderId: null,
        isInitializing: false,
        error: null,
      });
    }
  };

  // Change to a custom spreadsheet ID for collaboration
  const handleSaveCustomSheet = async () => {
    if (!currentUser) return;
    
    if (customSheetId.trim() === '') {
      // Revert to automatic
      localStorage.removeItem(`custom_sheet_id_${currentUser.email}`);
      localStorage.removeItem(`custom_folder_id_${currentUser.email}`);
      setShowConfigPanel(false);
      // Trigger reload database
      const config = await findOrCreateDatabase(accessToken!);
      setWorkspaceConfig(config);
    } else {
      // Save custom override
      localStorage.setItem(`custom_sheet_id_${currentUser.email}`, customSheetId.trim());
      setWorkspaceConfig({
        spreadsheetId: customSheetId.trim(),
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${customSheetId.trim()}/edit`,
        folderId: null, // Custom sheets upload to default or root usually
        isInitializing: false,
        error: null,
      });
      setShowConfigPanel(false);
    }
  };

  // Rendering Loading Check Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3.5" />
        <p className="text-xs font-semibold text-slate-500">Menyiapkan Otentikasi Aman...</p>
      </div>
    );
  }

  // Rendering LOGIN Onboarding View
  if (!currentUser || !accessToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-100/80 rounded-2xl p-8 shadow-sm text-center">
          {/* Visual Header Icon Branding */}
          <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl mb-5 shadow-md">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-2">Laporan Kinerja Harian</h1>
          <p className="text-xs text-slate-400 font-medium">Bekerja Cerdas, Transparan, & Real-Time</p>

          <div className="my-6 py-4.5 px-4 bg-slate-50 rounded-xl text-left border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse-slow" />
              Fitur Utama Aplikasi:
            </h4>
            <ul className="text-[11px] text-slate-500 font-medium space-y-1.5">
              <li className="flex gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                Tanggal & Jam otomatis tersinkron dengan waktu setempat.
              </li>
              <li className="flex gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                Unggah lampiran foto bukti tugas langsung dari file penyimpanan Anda.
              </li>
              <li className="flex gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                Ambil foto kamera secara lurus & instan dari webcam Anda.
              </li>
              <li className="flex gap-1.5">
                <span className="text-indigo-500 font-bold">•</span>
                Database cloud terintegrasi langsung di Google Sheets milik Anda sendiri.
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 mb-6 px-1 leading-relaxed">
            Silakan masuk menggunakan Akun Google Anda untuk menghubungkan log laporan dengan Spreadsheet & Drive pribadi atau tim Anda.
          </p>

          {/* Authentic Google Sign-in material button */}
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`gsi-material-button w-full justify-center flex items-center ${
              isLoggingIn ? 'opacity-80 cursor-not-allowed' : ''
            }`}
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                )}
              </div>
              <span className="gsi-material-button-contents text-xs font-bold font-sans">
                {isLoggingIn ? 'Membuka Jendela Masuk...' : 'Masuk dengan Google'}
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Render main layout
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* Dynamic Workspace Init Overlay */}
      {workspaceConfig.isInitializing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <RefreshCw className="w-9 h-9 text-indigo-600 animate-spin mx-auto mb-4" />
            <h4 className="text-sm font-bold text-slate-800">Menghubungkan Akun Google Anda</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kami sedang menyiapkan spreadsheet database dan folder penyimpanan foto Anda secara otomatis di Google Drive Anda. Harap tunggu beberapa saat...
            </p>
          </div>
        </div>
      )}

      {/* Primary Brand Navigation Bar */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-150">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">LKK Portal</h1>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sistem Laporan Kinerja Karyawan</p>
            </div>
          </div>

          {/* Quick User Actions Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="p-1 bg-indigo-100 text-indigo-600 rounded-full">
                  <UserIcon className="w-3 h-3" />
                </div>
              )}
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-700 leading-none">{currentUser.displayName || 'Karyawan'}</p>
                <p className="text-[9px] text-slate-400 leading-none mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.8 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition cursor-pointer"
              title="Keluar dari Aplikasi"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER PANEL */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">
        
        {/* Connection status Control Card */}
        {workspaceConfig.error ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 mb-6 animate-pulse-slow">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-red-800">Masalah Sinkronisasi Google Sheets Database</h4>
              <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">{workspaceConfig.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-[10px] font-extrabold text-red-700 underline flex items-center gap-1 cursor-pointer"
              >
                Coba Sinkronisasi Ulang Sekarang
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-800 truncate">Laporan Kinerja Harian (Database)</h4>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                    Akun Aktif: {currentUser.email}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Disimpan otomatis di Drive Anda. Seluruh entri laporan dicatat di Google Sheets secara real-time.
                </p>
              </div>
            </div>

            {/* Custom sheet ID controller or Direct Link */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 underline cursor-pointer"
              >
                {showConfigPanel ? 'Sembunyikan Panel ID' : 'Gunakan ID Spreadsheet Bersama'}
              </button>

              {workspaceConfig.spreadsheetUrl && (
                <a
                  href={workspaceConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Buka Spreadsheet
                </a>
              )}
            </div>
          </div>
        )}

        {/* Database Configuration Panel (Displays on demand) */}
        {showConfigPanel && (
          <div className="bg-slate-100 border border-slate-200/60 rounded-2xl p-4.5 mb-6 animate-fade-in">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Sesuaikan ID Spreadsheet Database
            </h4>
            <p className="text-[11px] text-slate-400 leading-snug mb-3">
              Secara default, aplikasi akan membuat file spreadsheet baru secara pribadi. Jika manager Anda membagikan file Spreadsheet master, paste ID spreadsheet tersebut ke kolom di bawah ini agar data disatukan ke tim pusat.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                placeholder="Masukkan Google Spreadsheet ID..."
                value={customSheetId}
                onChange={(e) => setCustomSheetId(e.target.value)}
                className="flex-1 px-3.5 py-1.8 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-mono focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomSheet}
                  className="px-4 py-1.8 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition cursor-pointer"
                >
                  Koneksikan ID Sheets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomSheetId('');
                    localStorage.removeItem(`custom_sheet_id_${currentUser.email}`);
                    window.location.reload();
                  }}
                  className="px-3 py-1.8 bg-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
                >
                  Reset Otomatis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Analytics Stats cards */}
        <StatsDashboard reports={reports} />

        {/* Two-Column split workspace dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-1">
          {/* Form Create (Left) */}
          <section className="lg:col-span-5" aria-label="Buat Laporan Baru">
            <ReportForm
              user={currentUser}
              workspaceConfig={workspaceConfig}
              accessToken={accessToken}
              onReportAdded={fetchReportData}
            />
          </section>

          {/* List History (Right) */}
          <section className="lg:col-span-7 flex flex-col self-stretch" aria-label="Daftar Riwayat Laporan">
            <ReportHistory
              reports={reports}
              currentUser={currentUser}
              onRefresh={fetchReportData}
              isLoading={isLoadingReports}
            />
          </section>
        </div>
      </main>

      {/* Aesthetic humbler footer credit */}
      <footer className="bg-white border-t border-slate-100 py-4.5 px-6 text-center text-[10px] text-slate-400 font-semibold mt-auto leading-none">
        &copy; {new Date().getFullYear()} Sistem Laporan Kinerja Karyawan (LKK) • Terhubung Google Workspace cloud secara real-time
      </footer>
    </div>
  );
}
