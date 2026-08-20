// Helpers do fluxo de assinatura de contratos.

// Token aleatório e difícil de adivinhar (id do documento de assinatura).
export function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildSignUrl(token: string): string {
  const origin = window.location.origin;
  return `${origin}/?assinar=${token}`;
}

// Envia e-mail via função serverless. Retorna false sem quebrar o fluxo
// (ex.: no localhost, onde a função da Vercel não existe).
export async function sendEmail(payload: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const shell = (title: string, body: string) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#0b1020;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4353e6,#22d3ee);padding:24px 28px">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.02em">FlowSign</span>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#0b1020">${title}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #eef1f6;color:#94a3b8;font-size:12px">
        FlowSign · Gestão de contratos e SLA
      </div>
    </div>
  </div>`;

export function supplierInviteEmail(opts: {
  supplierName: string;
  companyName: string;
  contractName: string;
  link: string;
}): { subject: string; html: string } {
  return {
    subject: `Assinatura do contrato "${opts.contractName}" — ${opts.companyName}`,
    html: shell(
      'Você recebeu um contrato para assinar',
      `<p style="color:#475569;line-height:1.6;font-size:14px">
        Olá${opts.supplierName ? ` <b>${opts.supplierName}</b>` : ''}, a empresa <b>${opts.companyName}</b>
        enviou o contrato <b>"${opts.contractName}"</b> para a sua assinatura digital.
      </p>
      <p style="text-align:center;margin:28px 0">
        <a href="${opts.link}" style="background:#4353e6;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:14px;display:inline-block">
          Revisar e assinar
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6">
        Se o botão não funcionar, copie e cole este link no navegador:<br>${opts.link}
      </p>`
    ),
  };
}

export function incidentOpenedEmail(opts: {
  responsibleName: string;
  contractName: string;
  system: string;
  priority: string;
  description: string;
  openedAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Novo chamado aberto — ${opts.system} (${opts.priority})`,
    html: shell(
      'Um chamado foi aberto',
      `<p style="color:#475569;line-height:1.6;font-size:14px">
        Olá${opts.responsibleName ? ` <b>${opts.responsibleName}</b>` : ''}, um chamado foi aberto no contrato
        <b>"${opts.contractName}"</b>, do qual você é responsável.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#0b1020">
        <tr><td style="padding:6px 0;color:#94a3b8">Sistema/Serviço</td><td style="padding:6px 0"><b>${opts.system}</b></td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Prioridade</td><td style="padding:6px 0"><b>${opts.priority}</b></td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Aberto em</td><td style="padding:6px 0">${opts.openedAt}</td></tr>
      </table>
      ${opts.description ? `<p style="color:#475569;line-height:1.6;font-size:14px"><b>Descrição:</b><br>${opts.description}</p>` : ''}`
    ),
  };
}

export function slaBreachEmail(opts: {
  responsibleName: string;
  contractName: string;
  system: string;
  supplierName: string;
  slaLimit: number;
  hoursElapsed: number;
}): { subject: string; html: string } {
  return {
    subject: `⚠️ SLA ESTOURADO — ${opts.system}`,
    html: shell(
      'SLA estourado — atenção máxima',
      `<p style="color:#b91c1c;line-height:1.6;font-size:14px;font-weight:600">
        O SLA do chamado "${opts.system}" foi ultrapassado. Necessidade máxima de atendimento.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#0b1020">
        <tr><td style="padding:6px 0;color:#94a3b8">Contrato</td><td style="padding:6px 0"><b>${opts.contractName}</b></td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Fornecedor</td><td style="padding:6px 0">${opts.supplierName}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Meta de SLA</td><td style="padding:6px 0">${opts.slaLimit}h</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8">Tempo decorrido</td><td style="padding:6px 0"><b>${opts.hoursElapsed}h</b></td></tr>
      </table>`
    ),
  };
}

export function signedConfirmationEmail(opts: {
  contractName: string;
  signerName: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Contrato "${opts.contractName}" foi assinado ✅`,
    html: shell(
      'Contrato assinado com sucesso',
      `<p style="color:#475569;line-height:1.6;font-size:14px">
        O contrato <b>"${opts.contractName}"</b> foi assinado por <b>${opts.signerName}</b>.
        O status já foi atualizado para <b>Ativo</b> no portal do FlowSign.
      </p>
      <p style="color:#475569;line-height:1.6;font-size:14px">
        Estamos muito felizes com essa parceria! 🎉
      </p>`
    ),
  };
}
