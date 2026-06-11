import type { WhatsappCredentials } from '../tenants/tenants.service.js';
import { BadRequestError } from '../../shared/errors/app-error.js';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

export interface SendMessageResult {
  messageId: string;
}

export async function sendWhatsappTextMessage(
  to: string,
  body: string,
  creds: WhatsappCredentials,
): Promise<SendMessageResult> {
  // Normalize phone: strip non-digit chars, keep leading +
  const phone = to.replace(/[^+\d]/g, '').replace(/^\+/, '');

  const res = await fetch(`${GRAPH_API}/${creds.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { body, preview_url: false },
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (payload as { error?: { message?: string } }).error?.message ?? 'WhatsApp API error';
    throw new BadRequestError(msg, 'WHATSAPP_SEND_FAILED');
  }

  const data = await res.json() as { messages?: Array<{ id: string }> };
  return { messageId: data.messages?.[0]?.id ?? '' };
}
