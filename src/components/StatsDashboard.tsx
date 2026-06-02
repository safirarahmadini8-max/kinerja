import { DailyReport } from '../types';
import { CheckCircle2, Play, Hourglass, BarChart3, TrendingUp } from 'lucide-react';

interface StatsDashboardProps {
  reports: DailyReport[];
}

export default function StatsDashboard({ reports }: StatsDashboardProps) {
  const total = reports.length;
  const selesai = reports.filter(r => r.status === 'Selesai').length;
  const sedangBerjalan = reports.filter(r => r.status === 'Sedang Berjalan').length;
  const menungguReview = reports.filter(r => r.status === 'Menunggu Review').length;

  const completionRate = total > 0 ? Math.round((selesai / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
      {/* Total Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Laporan</span>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{total}</h4>
          <p className="text-[10px] text-slate-400 mt-1">Seluruh laporan terkirim</p>
        </div>
      </div>

      {/* Selesai Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Selesai</span>
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <h4 className="text-2xl font-bold text-emerald-700 tracking-tight">{selesai}</h4>
          <p className="text-[10px] text-slate-400 mt-1">Pekerjaan terselesaikan</p>
        </div>
      </div>

      {/* Sedang Berjalan Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Berjalan</span>
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
            <Play className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <h4 className="text-2xl font-bold text-blue-700 tracking-tight">{sedangBerjalan}</h4>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">Masih diupayakan</p>
        </div>
      </div>

      {/* Menunggu Review Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Review</span>
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
            <Hourglass className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <h4 className="text-2xl font-bold text-amber-700 tracking-tight">{menungguReview}</h4>
          <p className="text-[10px] text-slate-400 mt-1">Menunggu validasi</p>
        </div>
      </div>

      {/* % Selesai Card (Spans 2 columns on mobile for better symmetry) */}
      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-2 -bottom-2 opacity-5">
          <TrendingUp className="w-24 h-24 text-white" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Rasio Selesai</span>
          <div className="p-1.5 bg-white/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-4 h-4 animate-pulse" />
          </div>
        </div>
        <div className="mt-2.5 relative z-10">
          <div className="flex items-baseline gap-1.5">
            <h4 className="text-2xl font-extrabold text-white tracking-tight">{completionRate}%</h4>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
