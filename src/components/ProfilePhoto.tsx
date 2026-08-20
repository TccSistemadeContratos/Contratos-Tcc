import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { resizeImageToDataUrl } from '../lib/image';
import { Camera, Upload, X, Loader2, Trash2, Check, RefreshCw } from 'lucide-react';

export const ProfilePhoto: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { profile, refresh } = useAuth();
  const [preview, setPreview] = useState<string>(profile?.photoUrl || '');
  const [cameraOn, setCameraOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOn(true);
      // aguarda o elemento montar
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setError('Não foi possível abrir a câmera. Verifique a permissão do navegador.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // recorte quadrado central
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 512, 512);
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem.');
      return;
    }
    try {
      setPreview(await resizeImageToDataUrl(file, 512));
    } catch {
      setError('Não foi possível processar a imagem.');
    }
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', profile.uid), { photoUrl: preview });
      await refresh();
      onClose();
    } catch {
      setError('Não foi possível salvar a foto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h3 className="text-lg font-bold">Foto de perfil</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="mx-auto grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
            {cameraOn ? (
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            ) : preview ? (
              <img src={preview} alt="Prévia" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-slate-300">
                {(profile?.displayName || profile?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {cameraOn ? (
            <div className="flex gap-2">
              <button
                onClick={capture}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Camera size={17} /> Capturar
              </button>
              <button
                onClick={stopCamera}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Upload size={17} /> Enviar foto
              </button>
              <button
                onClick={startCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {preview ? <RefreshCw size={17} /> : <Camera size={17} />} Câmera
              </button>
            </div>
          )}

          {!cameraOn && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              {preview ? (
                <button
                  onClick={() => setPreview('')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 transition hover:text-red-600"
                >
                  <Trash2 size={16} /> Remover
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                Salvar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
