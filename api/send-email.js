// Função serverless (Vercel) que envia e-mail via Gmail SMTP.
// Configure na Vercel (Settings → Environment Variables):
//   GMAIL_USER          = projetocontratosfacul@gmail.com
//   GMAIL_APP_PASSWORD  = senha de app gerada em https://myaccount.google.com/apppasswords
//
// Observação: só funciona em produção (Vercel). No localhost o app degrada
// para "copiar link" e não envia e-mail.
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res.status(500).json({ error: 'E-mail não configurado no servidor.' });
  }

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Campos obrigatórios: to, subject, html.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `FlowSign <${user}>`,
      to,
      subject,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    return res.status(500).json({ error: 'Falha ao enviar o e-mail.' });
  }
}
