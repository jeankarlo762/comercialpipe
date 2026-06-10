export const API4COM_APP_URL = 'https://app.api4com.com';

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) digits = `55${digits}`; // assume Brasil quando sem DDI
  return digits;
}

export function whatsappHref(phone: string): string {
  return `https://wa.me/${normalizePhone(phone)}`;
}

export function api4comHref(phone: string): string {
  return `${API4COM_APP_URL}/?number=${encodeURIComponent(phone.replace(/\D/g, ''))}`;
}

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
