import React, { useState, useEffect, useRef } from 'react';
import { Camera, UploadCloud, FolderUp, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { WorkspaceConfig, DailyReport } from '../types';
import { uploadPhotoToDrive, addReport } from '../lib/sheetsService';
import CameraCapture from './CameraCapture';

interface ReportFormProps {
  user: User;
  workspaceConfig: WorkspaceConfig;
  accessToken: string;
  onReportAdded: () => void;
}

export default function ReportForm({ user, workspaceConfig, accessToken, onReportAdded }: ReportFormProps) {
  // Setup Date and Time defaults
  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTime = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Form Fields State
  const [tanggal, setTanggal] = useState(getTodayDate());
  const [jam, setJam] = useState(getCurrentTime());
  const [namaTugas, setNamaTugas] = useState('');
  const [deskripsiProgres, setDeskripsiProgres] = useState('');
  const [status, setStatus] = useState<'Selesai' | 'Sedang Berjalan' | 'Menunggu Review'>('Selesai');
  
  // File System & Camera State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // loading / alerts State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Automatically update current date and time on mount
  useEffect(() => {
    setTanggal(getTodayDate());
    setJam(getCurrentTime());
  }, []);

  // Sync state preview url with selected file
  useEffect(() => {
    if (!selectedFile) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setImagePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Handle file drop 
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        setInfoMessage({ type: 'error', text: 'Format file tidak didukung. Harap pilih gambar saja.' });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle performance report submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !accessToken) {
      setInfoMessage({ type: 'error', text: 'Sesi kedaluwarsa. Silakan masuk kembali.' });
      return;
    }

    if (!workspaceConfig.spreadsheetId) {
      setInfoMessage({ type: 'error', text: 'Spreadsheet belum diinisialisasi. Periksa koneksi Database.' });
      return;
    }

    if (!namaTugas.trim() || !deskripsiProgres.trim()) {
      setInfoMessage({ type: 'error', text: 'Harap lengkapi semua kolom wajib!' });
      return;
    }

    if (!selectedFile) {
      setInfoMessage({ type: 'error', text: 'Wajib melampirkan foto bukti pekerjaan.' });
      return;
    }

    setIsSubmitting(true);
    setInfoMessage(null);

    try {
      // 1. Upload the image directly to user's Google Drive
      const uploadResult = await uploadPhotoToDrive(accessToken, workspaceConfig.folderId, selectedFile);
      
      // 2. Build DailyReport structure
      const reportId = 'LKK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const newReport: DailyReport = {
        id: reportId,
        tanggal,
        jam,
        namaTugas: namaTugas.trim(),
        deskripsiProgres: deskripsiProgres.trim(),
        linkFoto: uploadResult.webViewLink,
        fileIdFoto: uploadResult.fileId,
        namaKaryawan: user.displayName || 'Karyawan',
        emailKaryawan: user.email || '',
        status
      };

      // 3. Append row in Sheets database
      await addReport(accessToken, workspaceConfig.spreadsheetId, newReport);

      // success state resets
      setNamaTugas('');
      setDeskripsiProgres('');
      setSelectedFile(null);
      setJam(getCurrentTime());
      setInfoMessage({ type: 'success', text: 'Laporan kinerja harian Anda berhasil terkirim dan sinkron secara real-time ke Google Sheets!' });
      onReportAdded();
    } catch (err: any) {
      console.error(err);
      setInfoMessage({ type: 'error', text: err.message || 'Gagal mengirim laporan. Coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <FolderUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 leading-tight">Buat Laporan Baru</h3>
          <p className="text-xs text-slate-400">Unggah progres tugas harian Anda</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date & Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tanggal</label>
            <input
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Jam</label>
            <input
              type="time"
              required
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Task Name Box */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nama Tugas / Aktivitas *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Desain landing page, perbaikan bug login"
            value={namaTugas}
            onChange={(e) => setNamaTugas(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Rich Description Areas */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Deskripsi Progres Pekerjaan *</label>
          <textarea
            required
            rows={4}
            placeholder="Jelaskan apa yang sudah diselesaikan, kendala yang dihadapi, dan progres spesifik yang dicapai dalam tugas ini..."
            value={deskripsiProgres}
            onChange={(e) => setDeskripsiProgres(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Status Group Buttons */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Status Pekerjaan</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Selesai', label: 'Selesai', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/20' },
              { id: 'Sedang Berjalan', label: 'Berjalan', color: 'border-blue-500 text-blue-600 bg-blue-50/20' },
              { id: 'Menunggu Review', label: 'Review', color: 'border-amber-500 text-amber-600 bg-amber-50/20' }
            ].map((pVal) => {
              const isSelected = status === pVal.id;
              return (
                <button
                  key={pVal.id}
                  type="button"
                  onClick={() => setStatus(pVal.id as any)}
                  className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                    isSelected 
                      ? `${pVal.color} ring-1 ring-slate-100 font-bold scale-[1.02]` 
                      : 'border-slate-200/80 text-slate-500 bg-slate-50/50 hover:bg-slate-100/50 hover:text-slate-700'
                  }`}
                >
                  {pVal.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Uploader */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Lampiran Foto Bukti Pekerjaan *</label>
          
          {imagePreviewUrl ? (
            <div className="relative overflow-hidden border border-slate-200 bg-slate-50 rounded-xl p-2.5 flex items-center gap-3">
              <img
                src={imagePreviewUrl}
                alt="File preview"
                className="w-16 h-16 object-cover rounded-lg border border-slate-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{selectedFile?.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB
                </p>
                <span className="inline-block mt-1 text-[9px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                  Siap diunggah ke Drive
                </span>
              </div>
              <button
                type="button"
                onClick={removeSelectedFile}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors mr-1"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400/80 bg-slate-50/50 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
            >
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full"
              >
                <div className="p-2 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-500 text-slate-400 rounded-xl transition mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-600">
                  Seret gambar ke sini, atau <span className="text-indigo-600 font-bold underline">Cek File</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Format JPG/PNG/WEBP hingga 10MB</p>
              </div>

              {/* Camera Support Buttons */}
              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-slate-150/50 w-full justify-center">
                <span className="text-[10px] text-slate-400">Atau gunakan</span>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Ambil Foto Kamera
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Message Indicator */}
        {infoMessage && (
          <div className={`p-4 rounded-xl flex items-start gap-2.5 text-xs font-medium ${
            infoMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
              : 'bg-red-50 text-red-800 border border-red-100'
          }`}>
            {infoMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            )}
            <span>{infoMessage.text}</span>
          </div>
        )}

        {/* Submit Actions */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.8 px-4 font-bold text-sm text-center rounded-xl transition duration-300 shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
            isSubmitting
              ? 'bg-indigo-400 text-white cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow shadow-indigo-100 text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Memproses Laporan & Bukti Foto...</span>
            </>
          ) : (
            <span>Kirim Laporan Kinerja</span>
          )}
        </button>
      </form>

      {/* Show Cam Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => setSelectedFile(file)}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
