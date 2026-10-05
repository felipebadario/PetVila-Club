import type { Lead } from './schema';

const ENDPOINT = '/api/leads';

export type SubmitResult = { ok: true } | { ok: false; message: string; errors?: Record<string, string> };

export async function submitLead(lead: Lead & { website?: string }): Promise<SubmitResult> {
  // Modo demonstração (prévia estática sem servidor): simula sucesso e não envia nada.
  if (import.meta.env.PUBLIC_DEMO_MODE === 'true') {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, message: body.message || 'Não conseguimos registrar agora.', errors: body.errors };
  } catch {
    return { ok: false, message: 'Parece que a conexão caiu. Tenta de novo?' };
  }
}
