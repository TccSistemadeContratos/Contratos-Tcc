import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sendEmail, signedConfirmationEmail } from '../lib/signatures';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  FileSignature,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Eraser,
  PenLine,
  Building2,
  FileText,
} from 'lucide-react';

type State = 'loading' | 'ready' | 'signed' | 'done' | 'notfound';

export const SignContract: React.FC<{ token: string }> = ({ token }) => {
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<any>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'signatureRequests', token));
        if (!snap.exists()) return setState('notfound');
        const d = snap.data();
        setData(d);
        setState(d.signed ? 'signed' : 'ready');
      } catch {
        setState('notfound');
      }
    })();
  }, [token]);

  // ---- Assinatura no canvas ----
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#0b1020';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    hasDrawn.current = true;
  };
  const end = () => (drawing.current = false);
  const clearCanvas = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    hasDrawn.current = false;
  };

  const handleSign = async () => {
    setError('');
    if (name.trim().length < 3) return setError('Digite seu nome completo.');
    if (!hasDrawn.current) return setError('Faça sua assinatura no quadro acima.');
    setSaving(true);
    try {
      const signatureData = canvasRef.current!.toDataURL('image/png');
      await updateDoc(doc(db, 'signatureRequests', token), {
        signed: true,
        signerName: name.trim(),
        signedAt: new Date().toISOString(),
        signatureData,
      });
      // Retorno por e-mail para quem enviou (best-effort)
      if (data?.requesterEmail) {
        const mail = signedConfirmationEmail({
          contractName: data.contractName,
          signerName: name.trim(),
          companyName: data.companyName,
        });
        sendEmail({ to: data.requesterEmail, ...mail });
      }
      setState('done');
    } catch {
      setError('Não foi possível registrar a assinatura. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Telas de estado ----
  if (state === 'loading') {
    return (
      <Centered>
        <Loader2 className="animate-spin text-blue-400" size={32} />
      </Centered>
    );
  }

  if (state === 'notfound') {
    return (
      <Centered>
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-slate-300">
            <FileText size={26} />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Link inválido</h1>
          <p className="mt-2 text-sm text-slate-400">
            Este link de assinatura não existe ou expirou. Peça um novo à empresa.
          </p>
        </div>
      </Centered>
    );
  }

  if (state === 'signed' || state === 'done') {
    return (
      <Centered>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            {state === 'done' ? 'Contrato assinado!' : 'Este contrato já foi assinado'}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-300/80">
            {state === 'done'
              ? `Obrigado, ${data?.signerName || name}! O contrato "${data?.contractName}" está formalizado e ativo. Estamos muito felizes com a parceria! 🎉`
              : `O contrato "${data?.contractName}" já consta como assinado.`}
          </p>
        </motion.div>
      </Centered>
    );
  }

  // state === 'ready'
  return (
    <div className="fs-aurora relative min-h-screen overflow-hidden px-4 py-10">
      <div className="fs-grid pointer-events-none absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-lg"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
            <FileSignature size={18} className="text-white" strokeWidth={2.25} />
          </div>
          <span className="font-display text-lg font-bold text-white">
            Flow<span className="text-blue-400">Sign</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Assinatura de contrato</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">{data?.contractName}</h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {data?.companyName}</span>
              {data?.value ? <span>{formatCurrency(data.value)}</span> : null}
              {data?.endDate ? <span>Vigência até {formatDate(data.endDate)}</span> : null}
            </div>
          </div>

          <div className="space-y-5 p-6">
            <p className="text-sm leading-relaxed text-slate-600">
              Olá{data?.supplierName ? ` ${data.supplierName}` : ''}, revise as informações acima e assine abaixo para
              formalizar o contrato. Ao assinar, você confirma o aceite dos termos.
            </p>

            {data?.pdfData && (
              <button
                onClick={() => openPdf(data.pdfData)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileText size={16} /> Ver documento (PDF)
              </button>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Seu nome completo</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome de quem está assinando"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/12"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Assinatura</label>
                <button onClick={clearCanvas} className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600">
                  <Eraser size={13} /> Limpar
                </button>
              </div>
              <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={180}
                  onPointerDown={start}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerLeave={end}
                  className="h-[180px] w-full touch-none"
                />
                <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-xs text-slate-300">
                  <PenLine size={12} /> assine aqui
                </span>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleSign}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {saving ? 'Registrando...' : 'Assinar contrato'}
            </button>
            <p className="text-center text-xs text-slate-400">Assinatura eletrônica registrada com data e hora.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

function openPdf(dataUrl: string) {
  try {
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    window.open(url, '_blank');
  } catch {
    window.open(dataUrl, '_blank');
  }
}

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fs-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4">
    <div className="fs-grid pointer-events-none absolute inset-0" />
    <div className="relative">{children}</div>
  </div>
);
