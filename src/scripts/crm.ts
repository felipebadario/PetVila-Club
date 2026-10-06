/** Interações do CRM: filtros, indicadores, edição de status/nota e exportação CSV. */
import type { CrmLead } from '../lib/leads/store';

interface Data {
  leads: CrmLead[];
  labels: { porte: Record<string, string>; idade: Record<string, string>; interesse: Record<string, string> };
  statuses: string[];
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Plano de interesse. Leads anteriores ao campo (vazio, null, undefined) = "Não informado".
const PLAN_LABELS: Record<string, string> = { essential: 'Vila Essential', care: 'Vila Care', undecided: 'Indeciso' };
const planOf = (l: { preferredPlan?: unknown }) => (typeof l.preferredPlan === 'string' && PLAN_LABELS[l.preferredPlan] ? l.preferredPlan : '');
const planLabel = (code: string) => PLAN_LABELS[code] || 'Não informado';

const fmtPhone = (d: string) =>
  d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d;

export function initCrm() {
  const el = document.getElementById('crm-data');
  if (!el) return;
  const { leads, labels, statuses } = JSON.parse(el.textContent || '{}') as Data;
  const rows = document.querySelector<HTMLElement>('[data-rows]')!;
  const empty = document.querySelector<HTMLElement>('[data-empty]')!;
  const count = document.querySelector<HTMLElement>('[data-count]')!;
  const toast = document.querySelector<HTMLElement>('[data-toast]')!;
  const f = (k: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${k}"]`)!;

  let toastTimer = 0;
  const say = (msg: string) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-on'), 2200);
  };

  /* ---------- Indicadores ---------- */
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const set = (k: string, v: number) => (document.querySelector(`[data-kpi="${k}"]`)!.textContent = v.toLocaleString('pt-BR'));
  set('total', leads.length);
  set('hoje', leads.filter((l) => +new Date(l.criado_em) >= startOfDay).length);
  set('semana', leads.filter((l) => now - +new Date(l.criado_em) < 7 * 864e5).length);
  set('novos', leads.filter((l) => (l.status || 'novo') === 'novo').length);

  const tally = (values: string[]) => {
    const m = new Map<string, number>();
    values.forEach((v) => m.set(v, (m.get(v) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const breakdown = (key: string, entries: [string, number][], label = (s: string) => s) => {
    const ol = document.querySelector(`[data-bd="${key}"]`)!;
    const max = Math.max(1, ...entries.map((e) => e[1]));
    ol.innerHTML = entries.length
      ? entries
          .slice(0, 6)
          .map(([k, n]) => `<li><span title="${esc(label(k))}">${esc(label(k))}</span><span class="bar"><i style="width:${(n / max) * 100}%"></i></span><span class="n">${n}</span></li>`)
          .join('')
      : '<li><span>Sem dados ainda</span></li>';
  };
  breakdown('porte', tally(leads.map((l) => l.porte)), (k) => labels.porte[k] || k);
  breakdown('interesses', tally(leads.flatMap((l) => l.interesses)), (k) => labels.interesse[k] || k);
  breakdown('origem', tally(leads.map((l) => l.utm_source || l.referrer || 'direto')));
  breakdown('uf', tally(leads.map((l) => l.uf)));

  /* ---------- Tabela ---------- */
  const filtered = () => {
    const q = f('q').value.trim().toLowerCase();
    const st = f('status').value, porte = f('porte').value, interesse = f('interesse').value, uf = f('uf').value;
    return leads.filter(
      (l) =>
        (!q || [l.nome, l.nome_cao, l.email, l.cidade, l.whatsapp].join(' ').toLowerCase().includes(q)) &&
        (!st || (l.status || 'novo') === st) &&
        (!porte || l.porte === porte) &&
        (!interesse || l.interesses.includes(interesse as never)) &&
        (!uf || l.uf === uf),
    );
  };

  const render = () => {
    const list = filtered();
    count.textContent = `${list.length} de ${leads.length}`;
    empty.hidden = list.length > 0;
    rows.innerHTML = list
      .map((l) => {
        const status = l.status || 'novo';
        const wa = l.whatsapp ? `https://wa.me/55${l.whatsapp}` : '';
        return `<tr data-id="${esc(l.id)}">
          <td class="date">${esc(fmtDate(l.criado_em))}</td>
          <td><strong>${esc(l.nome)}</strong></td>
          <td>${esc(l.nome_cao)}<small>${esc(labels.porte[l.porte] || l.porte)} · ${esc(labels.idade[l.idade_faixa] || l.nascimento || '')}</small></td>
          <td><a href="mailto:${esc(l.email)}">${esc(l.email)}</a>${wa ? `<small><a href="${wa}" target="_blank" rel="noopener">${esc(fmtPhone(l.whatsapp))}</a></small>` : ''}</td>
          <td>${esc(l.cidade)}<small>${esc(l.uf)}</small></td>
          <td><div class="chips">${l.interesses.map((i) => `<span>${esc(labels.interesse[i] || i)}</span>`).join('')}</div></td>
          <td><span class="plan-tag" data-plan="${planOf(l)}">${esc(planLabel(planOf(l)))}</span></td>
          <td>${esc(l.utm_source || 'direto')}<small>${esc([l.utm_campaign, l.cta_origem].filter(Boolean).join(' · '))}</small></td>
          <td><select data-status="${esc(status)}" aria-label="Status de ${esc(l.nome)}">${statuses
            .map((s) => `<option value="${s}"${s === status ? ' selected' : ''}>${s}</option>`)
            .join('')}</select></td>
          <td><textarea rows="1" aria-label="Nota sobre ${esc(l.nome)}" placeholder="Anotar…">${esc(l.nota)}</textarea></td>
        </tr>`;
      })
      .join('');
  };

  ['q', 'status', 'porte', 'interesse', 'uf'].forEach((k) => f(k).addEventListener('input', render));
  render();

  /* ---------- Edição ---------- */
  const save = async (id: string, patch: Record<string, string>) => {
    const res = await fetch('/api/crm/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401) location.reload();
    if (!res.ok) throw new Error(out.message || 'Não consegui salvar.');
    const lead = leads.find((l) => l.id === id);
    if (lead) Object.assign(lead, patch);
  };

  rows.addEventListener('change', async (e) => {
    const t = e.target as HTMLElement;
    const id = t.closest('tr')?.dataset.id;
    if (!id) return;
    try {
      if (t instanceof HTMLSelectElement) {
        t.dataset.status = t.value;
        await save(id, { status: t.value });
        set('novos', leads.filter((l) => (l.status || 'novo') === 'novo').length);
        say('Status salvo');
      } else if (t instanceof HTMLTextAreaElement) {
        await save(id, { nota: t.value });
        say('Nota salva');
      }
    } catch (err) {
      say(err instanceof Error ? err.message : 'Não consegui salvar.');
    }
  });

  /* ---------- Exportação (respeita os filtros) ---------- */
  document.querySelector('[data-export]')?.addEventListener('click', () => {
    const cols: (keyof CrmLead)[] = [
      'criado_em', 'status', 'nome', 'email', 'whatsapp', 'nome_cao', 'porte', 'idade_faixa', 'nascimento',
      'cidade', 'uf', 'interesses', 'preferredPlan', 'cta_origem', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
      'utm_term', 'referrer', 'nota', 'id',
    ];
    const cell = (v: unknown) => {
      let s = Array.isArray(v) ? v.join(', ') : String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmula ao abrir no Excel/Sheets
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = '﻿' + [cols.join(';'), ...filtered().map((l) => cols.map((c) => cell(l[c])).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `primeiros-da-vila-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
