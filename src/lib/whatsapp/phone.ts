/** Telefones para a Cloud API: só dígitos, com código do país (E.164 sem o "+"). */
import { normalizeWhatsapp } from '../leads/schema';

/**
 * Número brasileiro do cadastro (com ou sem 55, com máscara) -> "55" + DDD + número.
 * Devolve '' quando não é um número brasileiro válido para WhatsApp.
 */
export function toWhatsAppNumber(input: string): string {
  const d = normalizeWhatsapp(input || '');
  if (d.length !== 10 && d.length !== 11) return '';
  // DDD: dois dígitos de 1 a 9 (não existe DDD com zero).
  if (!/^[1-9]{2}/.test(d)) return '';
  // Celular de 11 dígitos sempre começa com 9 depois do DDD.
  if (d.length === 11 && d[2] !== '9') return '';
  return '55' + d;
}

/** Mascara para logs: mantém país/DDD e os 2 últimos dígitos. */
export function maskPhone(v: unknown): string {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length < 6) return d ? '***' : '';
  return d.slice(0, 4) + '*'.repeat(d.length - 6) + d.slice(-2);
}
