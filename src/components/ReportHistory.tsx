import { useState } from 'react';
import { DailyReport } from '../types';
import { Search, Filter, Calendar, ExternalLink, RefreshCw, Layers, User as UserIcon, HelpCircle, X, Download, Tag } from 'lucide-react';
import { User } from 'firebase/auth';

interface ReportHistoryProps {
  reports: DailyReport[];
  currentUser: User;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function ReportHistory({ reports, currentUser, onRefresh, isLoading }: ReportHistoryProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [dateFilter, setDateFilter] = useState('');
  const [userScope, setUserScope] = useState<'Saya' | 'Tim'>('Saya');

  // Image lightbox Modal state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Filter Logic
  const filteredReports = reports.filter((report) => {
    // 1. User Scope
    if (userScope === 'Saya' && report.emailKaryawan !== currentUser.email) {
      return false;
    }

    // 2. Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTugas = report.namaTugas.toLowerCase().includes(term);
      const matchDeskripsi = report.deskripsiProgres.toLowerCase().includes(term);
      const matchUser = report.namaKaryawan.toLowerCase().includes(term) || report.emailKaryawan.toLowerCase().includes(term);
      if (!matchTugas && !matchDeskripsi && !matchUser) return false;
    }

    // 3. Status
    if (statusFilter !== 'Semua' && report.status !== statusFilter) {
      return false;
    }

    // 4. Date
    if (dateFilter && report.tanggal !== dateFilter) {
      return false;
    }

    return true;
  });

  // Export to CSV Function
  const exportToCsv = () => {
    if (filteredReports.length === 0) return;

    const headers = ['ID,Tanggal,Jam,Nama Tugas,Deskripsi Progres,Link Foto,Nama Karyawan,Email Karyawan,Status'];
    const rows = filteredReports.map(r => {
      const cleanTugas = `"${r.namaTugas.replace(/"/g, '""')}"`;
      const cleanDesc = `"${r.deskripsiProgres.replace(/"/g, '""')}"`;
      const cleanNama = `"${r.namaKaryawan.replace(/"/g, '""')}"`;
      return `${r.id || ''},${r.tanggal},${r.jam},${cleanTugas},${cleanDesc},"${r.linkFoto}",${cleanNama},${r.emailKaryawan},${r.status}`;
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kinerja_Harian_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (status: DailyReport['status']) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Sedang Berjalan':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Menunggu Review':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Convert Drive thumbnail loader
  const getThumbnailUrl = (report: DailyReport) => {
    if (report.fileIdFoto) {
      return `https://lh3.googleusercontent.com/d/${report.fileIdFoto}=s300`;
    }
    return report.linkFoto; // Fallback to raw link
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
      {/* Header operations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-150/50">
        <div>
          <h3 className="text-base font-bold text-slate-800 leading-tight">Daftar Laporan Kinerja</h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time sinkronisasi spreadsheet</p>
        </div>
        <div className="flex items-center gap-2">
          {/* My records vs Team Toggle */}
          <div className="bg-slate-50 border border-slate-200/60 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setUserScope('Saya')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                userScope === 'Saya' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-3 h-3" />
              Laporan Saya
            </button>
            <button
              onClick={() => setUserScope('Tim')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                userScope === 'Tim' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              Semua Tim
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 border border-slate-200/80 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {filteredReports.length > 0 && (
            <button
              onClick={exportToCsv}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition flex items-center gap-1 text-[11px] font-extrabold cursor-pointer border border-indigo-100"
              title="Unduh CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Unduh CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Form Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari tugas, deskripsi, karyawan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.2 bg-slate-50 border border-slate-200/85 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
          />
        </div>

        {/* Date Selector */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="date"
            placeholder="Filter tanggal..."
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.2 bg-slate-50 border border-slate-200/85 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
          />
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-red-500 text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Option Tabs */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-pulse-slow" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.2 bg-slate-50 border border-slate-200/85 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="Selesai">Selesai</option>
            <option value="Sedang Berjalan">Sedang Berjalan</option>
            <option value="Menunggu Review">Menunggu Review</option>
          </select>
        </div>
      </div>

      {/* Reports List Body */}
      <div className="flex-1 overflow-y-auto max-h-[520px] pr-1 space-y-3">
        {isLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs text-slate-400">Sinkronisasi data Google Sheets...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada laporan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status Anda.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div 
              key={report.id || Math.random().toString()}
              className="border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm rounded-xl p-4 transition duration-300 flex flex-col sm:flex-row gap-4.5 group"
            >
              {/* Photo Box Container */}
              <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 relative shrink-0 border border-slate-100 shadow-inner group/img cursor-pointer"
                   onClick={() => report.fileIdFoto ? setLightboxUrl(getThumbnailUrl(report)) : setLightboxUrl(report.linkFoto)}
              >
                <img
                  src={getThumbnailUrl(report)}
                  alt="Bukti Tugas"
                  className="w-full h-full object-cover transition-all duration-300 group-hover/img:scale-110"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to simpler loading state if CORS or token issues occur
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542546068979-b6affb46ea8f?q=80&w=150';
                  }}
                />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 transition duration-300 flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Main Content Info Block */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <Tag className="w-2.5 h-2.5" />
                      {report.id || 'NO-ID'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full shrink-0 ${getStatusBadgeClass(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-800 leading-tight mb-1 truncate">{report.namaTugas}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {report.deskripsiProgres}
                  </p>
                </div>

                {/* Footer Badges */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{report.tanggal}</span>
                    <span className="font-mono">{report.jam}</span>
                    {userScope === 'Tim' && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-slate-600 underline decoration-indigo-200">{report.namaKaryawan}</span>
                      </>
                    )}
                  </div>

                  <a
                    href={report.linkFoto}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka Foto Drive
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox Modal overlay */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-3xl w-full flex flex-col max-h-[85vh]">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-slate-950 p-2 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center flex-1">
              <img 
                src={lightboxUrl} 
                alt="Full preview" 
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
