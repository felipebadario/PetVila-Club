/** Fluxo do cadastro "Primeiros da Vila". */
import { validateLead, type Lead } from '../lib/leads/schema';
import { submitLead } from '../lib/leads/client';
import { track, readAttribution } from '../lib/tracking';
import { form as copy } from '../content/copy';

const maskWhatsapp = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function initLeadForm() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lead]');
  const formEl = dialog?.querySelector<HTMLFormElement>('[data-lead-form]');
  if (!dialog || !formEl) return;

  const steps = [...formEl.querySelectorAll<HTMLFieldSetElement>('[data-step]')];
  const dots = [...dialog.querySelectorAll<HTMLElement>('[data-dot]')];
  const progressLabel = dialog.querySelector<HTMLElement>('[data-progress-label]')!;
  const back = formEl.querySelector<HTMLButtonElement>('[data-back]')!;
  const next = formEl.querySelector<HTMLButtonElement>('[data-next]')!;
  const nextLabel = formEl.querySelector<HTMLElement>('[data-next-label]')!;
  const success = dialog.querySelector<HTMLElement>('[data-success]')!;
  const formErr = formEl.querySelector<HTMLElement>('[data-err="form"]')!;
  const whatsapp = formEl.elements.namedItem('whatsapp') as HTMLInputElement;

  let step = 0;
  let origin = '';
  let opener: HTMLElement | null = null;
  let done = false;

  whatsapp.addEventListener('input', () => (whatsapp.value = maskWhatsapp(whatsapp.value)));

  const values = (): Record<string, unknown> => {
    const fd = new FormData(formEl);
    return {
      nome: fd.get('nome'),
      nome_cao: fd.get('nome_cao'),
      porte: fd.get('porte') ?? '',
      idade_faixa: fd.get('idade_faixa') ?? '',
      nascimento: fd.get('nascimento') ?? '',
      email: fd.get('email'),
      whatsapp: fd.get('whatsapp'),
      cidade: fd.get('cidade'),
      uf: fd.get('uf'),
      interesses: fd.getAll('interesses'),
      consentimento: fd.get('consentimento') === 'on',
    };
  };

  const dogName = () => String(new FormData(formEl).get('nome_cao') || '').trim();

  const personalize = () => {
    const dog = dogName();
    formEl.querySelectorAll<HTMLElement>('[data-dog-template]').forEach((el) => {
      el.textContent = el.dataset.dogTemplate!.replace('{dog}', dog || 'seu cão');
    });
  };

  const showErrors = (errors: Record<string, string>, fields: string[]) => {
    for (const f of fields) {
      const msg = errors[f] ?? '';
      const slot = formEl.querySelector<HTMLElement>(`[data-err="${f}"]`);
      if (slot) slot.textContent = msg;
      formEl.querySelectorAll<HTMLInputElement>(`[name="${f}"]`).forEach((input) => {
        if (msg) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
    }
    const first = fields.find((f) => errors[f]);
    if (first) formEl.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const go = (i: number, dir: 1 | -1 = 1) => {
    steps[step].hidden = true;
    step = i;
    const el = steps[step];
    el.hidden = false;
    el.classList.remove('is-entering', 'is-entering-back');
    void el.offsetWidth;
    el.classList.add(dir === 1 ? 'is-entering' : 'is-entering-back');
    personalize();
    back.hidden = step === 0;
    nextLabel.textContent = step === steps.length - 1 ? 'Entrar para a Vila' : 'Continuar';
    progressLabel.textContent = `Passo ${step + 1} de ${steps.length}`;
    dots.forEach((d, j) => {
      d.classList.toggle('is-done', j < step);
      d.classList.toggle('is-current', j === step);
    });
    formErr.textContent = '';
    // Foco no primeiro campo da etapa (ou na pergunta, em etapas de escolha).
    const target = el.querySelector<HTMLElement>('input:not([type=radio]):not([type=checkbox]), select') ?? el.querySelector<HTMLElement>('input');
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };

  const open = (from: string, trigger: HTMLElement | null) => {
    origin = from;
    opener = trigger;
    if (done) {
      // Já cadastrado nesta visita: reabre a tela de boas-vindas.
      formEl.hidden = true;
      success.hidden = false;
    }
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => dialog.classList.add('is-open'));
    track('lead_form_open', { cta_origin: from });
    if (!done) go(step, 1);
  };

  const close = () => {
    dialog.classList.remove('is-open');
    const finish = () => {
      dialog.close();
      document.documentElement.style.overflow = '';
      opener?.focus({ preventScroll: true });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 380);
    if (!done) track('lead_form_close', { step: step + 1 });
  };

  document.addEventListener('click', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('[data-open-lead]');
    if (t) {
      e.preventDefault();
      track('cta_click', { cta_origin: t.dataset.openLead });
      open(t.dataset.openLead || 'unknown', t);
    }
  });
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // Clique no fundo (fora da folha) fecha.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  back.addEventListener('click', () => step > 0 && go(step - 1, -1));

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = steps[step].dataset.fields!.split(',') as (keyof Lead)[];
    const { ok, errors, data } = validateLead(values(), fields);
    showErrors(errors as Record<string, string>, fields);
    if (!ok) return;

    track('lead_step_complete', { step: step + 1 });
    if (step < steps.length - 1) return go(step + 1, 1);

    const attribution = readAttribution();
    const payload = {
      ...data,
      consentimento_versao: copy.consentVersion,
      consentimento_texto: copy.consentText,
      cta_origem: origin,
      utm_source: attribution.utm_source ?? '',
      utm_medium: attribution.utm_medium ?? '',
      utm_campaign: attribution.utm_campaign ?? '',
      utm_content: attribution.utm_content ?? '',
      utm_term: attribution.utm_term ?? '',
      referrer: attribution.referrer ?? '',
      landing_page: attribution.landing_page ?? location.pathname,
      website: String(new FormData(formEl).get('website') || ''),
    };

    next.disabled = true;
    const res = await submitLead(payload);
    next.disabled = false;
    if (!res.ok) {
      formErr.textContent = res.message;
      track('lead_submit_error', { message: res.message });
      return;
    }

    done = true;
    track('generate_lead', {
      cta_origin: origin,
      dog_size: data.porte,
      interests: data.interesses.join(','),
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
    });
    const body = success.querySelector<HTMLElement>('[data-success-body]')!;
    body.innerHTML = body.dataset.template!.replace('{dog}', `<strong>${escapeHtml(data.nome_cao)}</strong>`);
    formEl.hidden = true;
    success.hidden = false;
    success.focus();
  });

  success.querySelector('[data-track="instagram_click"]')?.addEventListener('click', () => track('instagram_click', { place: 'success' }));
}
