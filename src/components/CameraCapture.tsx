import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Kamera gagal diakses:', err);
      // Fallback to front camera or default
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (nestedErr: any) {
        setError('Gagal mengakses kamera Anda. Harap berikan izin akses kamera.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `kamera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            stopCamera();
            onClose();
          }
        }, 'image/jpeg', 0.85);
      }
    }
  };

  return (
    <div id="camera-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            Ambil Foto Bukti Pekerjaan
          </h3>
          <button 
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video bg-zinc-950 flex items-center justify-center">
          {error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Lagi
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-b-xl"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-emerald-400 px-2 py-1 text-[10px] font-semibold rounded-full flex items-center gap-1.5 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Kamera Aktif
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-medium text-xs rounded-xl transition"
          >
            Batal
          </button>
          
          {!error && (
            <button
              type="button"
              onClick={handleCapture}
              className="px-6 py-2.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-semibold text-xs rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Ambil Foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
