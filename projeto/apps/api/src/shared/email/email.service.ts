import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

function createTransport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const resetUrl = `${env.WEB_ORIGIN}/reset-password?token=${rawToken}`;

  const transport = createTransport();
  if (!transport) {
    console.info(`[email] reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Redefinição de senha — CRM NX',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;font-size:20px">Redefinir sua senha</h2>
        <p style="color:#555;margin:0 0 24px">
          Recebemos uma solicitação para redefinir a senha da sua conta CRM NX.
          Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          Redefinir senha
        </a>
        <p style="color:#999;font-size:12px;margin:24px 0 0">
          Se você não solicitou essa redefinição, ignore este e-mail.<br>
          O link acima é válido por 1 hora.
        </p>
      </div>
    `,
    text: `Acesse o link para redefinir sua senha: ${resetUrl}\n\nO link expira em 1 hora.`,
  });
}
