'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, ShieldAlert } from 'lucide-react';

interface SelfieCaptureProps {
  onCapture: (base64Photo: string) => void;
  onCancel: () => void;
}

export default function SelfieCapture({ onCapture, onCancel }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Izin akses kamera tidak diberikan atau perangkat kamera tidak terdeteksi.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for natural selfie view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Verifikasi Foto Selfie
            </h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative w-full aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-rose-300 mb-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
              >
                Coba Lagi
              </button>
            </div>
          ) : capturedPhoto ? (
            <img src={capturedPhoto} alt="Hasil Foto" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              {/* Selfie oval guide */}
              <div className="absolute inset-8 rounded-full border-2 border-dashed border-white/60 pointer-events-none" />
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center gap-3">
          {capturedPhoto ? (
            <>
              <button
                onClick={retake}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Foto Ulang
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto
              </button>
            </>
          ) : (
            <button
              onClick={takePhoto}
              disabled={!!cameraError}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

