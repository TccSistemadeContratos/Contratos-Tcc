import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

// Sem UI. Quando um fornecedor assina, este componente — rodando na sessão de
// um admin da empresa — atualiza o contrato para "Ativo" e cria a notificação.
//
// Por segurança (isolamento entre empresas), NÃO listamos signatureRequests.
// Observamos os contratos da própria empresa (já isolados) e consultamos cada
// token de assinatura por get() individual.
export const SignatureReconciler: React.FC = () => {
  const { companyId, isManager } = useAuth();
  const pending = useRef<{ contractId: string; token: string }[]>([]);
  const processing = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId || !isManager) return;

    const reconcile = async ({ contractId, token }: { contractId: string; token: string }) => {
      if (processing.current.has(token)) return;
      try {
        const snap = await getDoc(doc(db, 'signatureRequests', token));
        if (!snap.exists()) return;
        const data = snap.data() as any;
        if (!data.signed || data.reconciled) return;

        processing.current.add(token);
        await updateDoc(doc(db, 'contracts', contractId), {
          status: 'Ativo',
          signedAt: data.signedAt || new Date().toISOString(),
          signerName: data.signerName || '',
        });
        await addDoc(collection(db, 'notifications'), {
          companyId,
          type: 'assinatura',
          message: `Contrato "${data.contractName}" foi assinado por ${data.signerName || 'fornecedor'}. Status atualizado para Ativo.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'signatureRequests', token), { reconciled: true });
      } catch (err) {
        console.error('Falha ao reconciliar assinatura:', err);
        processing.current.delete(token);
      }
    };

    const checkAll = () => pending.current.forEach(reconcile);

    const unsub = onSnapshot(
      query(collection(db, 'contracts'), where('companyId', '==', companyId)),
      (snap) => {
        pending.current = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((c) => c.status === 'Pendente' && c.signatureToken)
          .map((c) => ({ contractId: c.id, token: c.signatureToken }));
        checkAll();
      }
    );

    // Verificação periódica leve enquanto houver contratos pendentes.
    const iv = setInterval(checkAll, 20000);

    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [companyId, isManager]);

  return null;
};
