/** DELETE /api/crm/lead: exige sessão do CRM e remove o lead da base local. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext, AstroCookies } from 'astro';
import { getLeadStore } from '../src/lib/leads/store';
import { makeLead, useTempCwd } from './helpers';

vi.mock('../src/lib/crm/auth', () => ({
  isAuthed: async (cookies: AstroCookies) => cookies.get('pv_crm')?.value === 'ok',
  sameOrigin: (r: Request) => !r.headers.get('origin') || r.headers.get('origin') === new URL(r.url).origin,
}));

const api = await import('../src/pages/api/crm/lead');

let restore: () => void;
beforeEach(async () => {
  restore = await useTempCwd();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

const del = (body: unknown, { authed = true, origin = 'https://petvilaclub.com.br' } = {}) => {
  const request = new Request('https://petvilaclub.com.br/api/crm/lead', {
    method: 'DELETE',
    headers: { origin },
    body: JSON.stringify(body),
  });
  const cookies = { get: () => (authed ? { value: 'ok' } : undefined) } as unknown as AstroCookies;
  return api.DELETE({ request, cookies } as unknown as APIContext);
};

describe('DELETE /api/crm/lead', () => {
  it('remove só o lead pedido', async () => {
    const store = getLeadStore()!;
    await store.save(makeLead({ id: 'real' }));
    await store.save(makeLead({ id: 'teste' }));
    const res = await del({ id: 'teste' });
    expect(res.status).toBe(200);
    expect((await store.list!()).map((l) => l.id)).toEqual(['real']);
  });

  it('sem sessão ou de outra origem não exclui nada', async () => {
    const store = getLeadStore()!;
    await store.save(makeLead({ id: 'A' }));
    expect((await del({ id: 'A' }, { authed: false })).status).toBe(401);
    expect((await del({ id: 'A' }, { origin: 'https://evil.example' })).status).toBe(401);
    expect(await store.list!()).toHaveLength(1);
  });

  it('id ausente ou inexistente', async () => {
    expect((await del({})).status).toBe(400);
    expect((await del({ id: 'nao-existe' })).status).toBe(404);
  });
});
