import { describe, expect, it } from 'vitest';
import { maskPhone, toWhatsAppNumber } from '../src/lib/whatsapp/phone';

describe('toWhatsAppNumber', () => {
  it('normaliza celular com máscara para 55 + DDD + número', () => {
    expect(toWhatsAppNumber('(11) 91234-5678')).toBe('5511912345678');
  });
  it('aceita número que já vem com 55 ou +55', () => {
    expect(toWhatsAppNumber('+55 21 98765-4321')).toBe('5521987654321');
    expect(toWhatsAppNumber('5521987654321')).toBe('5521987654321');
  });
  it('aceita 10 dígitos (fixo ou celular antigo)', () => {
    expect(toWhatsAppNumber('1133334444')).toBe('551133334444');
  });
  it('recusa DDD inválido, celular sem 9 e tamanhos errados', () => {
    expect(toWhatsAppNumber('01912345678')).toBe('');
    expect(toWhatsAppNumber('11812345678')).toBe('');
    expect(toWhatsAppNumber('123')).toBe('');
    expect(toWhatsAppNumber('')).toBe('');
  });
});

describe('maskPhone', () => {
  it('esconde o miolo do número', () => {
    expect(maskPhone('5511912345678')).toBe('5511*******78');
    expect(maskPhone('')).toBe('');
  });
});
