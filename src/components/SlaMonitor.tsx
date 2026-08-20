import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { sendEmail, slaBreachEmail } from '../lib/signatures';

// Sem UI. Roda na sessão de um gestor da empresa. Quando um chamado ultrapassa
// o prazo de SLA (abertura + horas do fornecedor), dispara UMA vez: e-mail ao
// responsável do contrato + notificação no portal (dedupe via slaAlertSent).
export const SlaMonitor: React.FC = () => {
  const { companyId, isManager } = useAuth();
  const data = useRef<{ incidents: any[]; contracts: any[]; suppliers: any[] }>({
    incidents: [],
    contracts: [],
    suppliers: [],
  });
  const processing = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId || !isManager) return;

    const check = async () => {
      const now = Date.now();
      for (const inc of data.current.incidents) {
        if (inc.status === 'Resolvido' || inc.slaAlertSent) continue;
        if (processing.current.has(inc.id)) continue;

        const contract = data.current.contracts.find((c) => c.id === inc.contractId);
        const supplier = data.current.suppliers.find((s) => s.id === (contract?.supplierId || inc.supplierId));
        const slaLimit = supplier?.slaLimit || 2;
        const deadline = new Date(inc.openedAt).getTime() + slaLimit * 3600 * 1000;
        if (now <= deadline) continue;

        processing.current.add(inc.id);
        try {
          await updateDoc(doc(db, 'incidents', inc.id), { slaAlertSent: true });

          const respEmail = inc.responsibleEmail || contract?.responsibleEmail;
          if (respEmail) {
            const mail = slaBreachEmail({
              responsibleName: inc.responsibleName || contract?.internalOwner || '',
              contractName: inc.contractName || contract?.name || '',
              system: inc.system,
              supplierName: supplier?.name || '',
              slaLimit,
              hoursElapsed: Math.floor((now - new Date(inc.openedAt).getTime()) / 3600000),
            });
            sendEmail({ to: respEmail, ...mail });
          }

          await addDoc(collection(db, 'notifications'), {
            companyId,
            type: 'violação',
            message: `SLA ESTOURADO no chamado "${inc.system}" (contrato "${inc.contractName || contract?.name || '-'}"). Atendimento urgente.`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Falha no alerta de SLA:', err);
          processing.current.delete(inc.id);
        }
      }
    };

    const unsubI = onSnapshot(query(collection(db, 'incidents'), where('companyId', '==', companyId)), (snap) => {
      data.current.incidents = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      check();
    });
    const unsubC = onSnapshot(query(collection(db, 'contracts'), where('companyId', '==', companyId)), (snap) => {
      data.current.contracts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    });
    const unsubS = onSnapshot(query(collection(db, 'suppliers'), where('companyId', '==', companyId)), (snap) => {
      data.current.suppliers = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    });

    const iv = setInterval(check, 30000);

    return () => {
      unsubI();
      unsubC();
      unsubS();
      clearInterval(iv);
    };
  }, [companyId, isManager]);

  return null;
};
