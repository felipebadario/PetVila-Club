/** Interações específicas de seção. */
import { reducedMotion, finePointer, lerp, onFrame, onScrollFrame, scrollProgress, clamp } from './env';
import { track } from '../lib/tracking';

/* ---------- A Rotina ---------- */
export function initRotina() {
  const root = document.querySelector<HTMLElement>('[data-rotina]');
  if (!root) return;
  const words = [...root.querySelectorAll<HTMLButtonElement>('[data-moment]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const track_ = root.querySelector<HTMLElement>('.rot__track')!;
  const bar = root.querySelector<HTMLElement>('.rot__progress span');
  let current = 0;

  const set = (i: number, source: string) => {
    if (i === current) return;
    current = i;
    words.forEach((w, j) => w.setAttribute('aria-pressed', String(j === i)));
    panels.forEach((p, j) => p.toggleAttribute('data-active', j === i));
    track('rotina_moment', { moment: words[i].textContent?.trim() ?? '', source });
  };

  // Layout "trilho" (touch / telas estreitas) é decidido pelo CSS; detectamos pelo tamanho do trilho.
  let rail = false;
  const measure = () => (rail = track_.offsetHeight > window.innerHeight * 1.5);
  measure();
  window.addEventListener('resize', measure, { passive: true });
  const isRail = () => rail;

  words.forEach((w, i) => {
    w.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !isRail()) set(i, 'hover');
    });
    w.addEventListener('focus', () => !isRail() && set(i, 'focus'));
    w.addEventListener('click', () => {
      if (!isRail()) return set(i, 'click');
      // No trilho, tocar numa palavra rola até o trecho daquele momento.
      const r = track_.getBoundingClientRect();
      const range = track_.offsetHeight - window.innerHeight;
      const target = window.scrollY + r.top + ((i + 0.5) / words.length) * range;
      window.scrollTo({ top: target, behavior: reducedMotion() ? 'auto' : 'smooth' });
    });
  });

  onScrollFrame(() => {
    if (!isRail()) return;
    const p = scrollProgress(track_);
    bar?.style.setProperty('--p', p.toFixed(3));
    set(Math.min(words.length - 1, Math.floor(p * words.length)), 'scroll');
  });
}

/* ---------- Curadoria: imagem que segue o cursor ---------- */
export function initCuradoria() {
  const root = document.querySelector<HTMLElement>('[data-curadoria]');
  const float = root?.querySelector<HTMLElement>('[data-cur-float]');
  if (!root || !float || !finePointer() || reducedMotion()) return;
  const imgs = [...float.children] as HTMLElement[];
  let tx = 0, ty = 0, x = 0, y = 0, active = false;

  root.querySelectorAll<HTMLElement>('[data-cat]').forEach((item) => {
    const i = Number(item.dataset.cat);
    item.addEventListener('pointerenter', () => {
      active = true;
      float.classList.add('is-on');
      imgs.forEach((img, j) => img.classList.toggle('is-on', j === i));
    });
    item.addEventListener('pointerleave', () => {
      active = false;
      float.classList.remove('is-on');
    });
  });
  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    tx = e.clientX - r.left - float.offsetWidth / 2 + 90;
    ty = e.clientY - r.top - float.offsetHeight / 2;
  });
  onFrame(() => {
    if (!active && !float.classList.contains('is-on')) return;
    x = lerp(x, tx, 0.14);
    y = lerp(y, ty, 0.14);
    const tilt = clamp((tx - x) / 30, -1, 1) * 8;
    float.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
  });
}

/* ---------- Como funciona: ciclo escolhido acende as caixas; passo em foco no scroll ---------- */
export function initComoFunciona() {
  const root = document.querySelector<HTMLElement>('[data-how]');
  if (!root) return;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-cycle-btn]')];
  const caption = root.querySelector<HTMLElement>('[data-cycle-caption]');

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const n = b.dataset.cycleBtn!;
      if (root.dataset.cycle === n) return;
      root.dataset.cycle = n;
      buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      if (caption) caption.textContent = caption.dataset.template!.replaceAll('{n}', n);
      track('cycle_select', { cycle: Number(n) });
    }),
  );

  const steps = [...root.querySelectorAll<HTMLElement>('[data-how-step]')];
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-current', e.isIntersecting)),
    { rootMargin: '-38% 0px -38% 0px' },
  );
  steps.forEach((s) => io.observe(s));
}

/* ---------- O Club: superfícies que reagem ao cursor / ao scroll no mobile ---------- */
export function initClub() {
  const plans = [...document.querySelectorAll<HTMLElement>('.plan')];
  if (!plans.length) return;
  if (finePointer()) {
    plans.forEach((p) => {
      p.addEventListener('pointermove', (e) => {
        const r = p.getBoundingClientRect();
        p.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        p.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      });
      p.addEventListener('pointerleave', () => {
        p.style.removeProperty('--mx');
        p.style.removeProperty('--my');
      });
    });
  } else {
    // Touch: a superfície no centro da tela fica "ativa".
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('is-hot', e.isIntersecting)),
      { rootMargin: '-40% 0px -40% 0px' },
    );
    plans.forEach((p) => io.observe(p));
  }
}

/* ---------- Manifesto: palavras acendem conforme o scroll ---------- */
export function initManifesto() {
  const root = document.querySelector<HTMLElement>('[data-manifesto]');
  if (!root) return;
  const words = [...root.querySelectorAll<HTMLElement>('.man__w')];
  const track_ = root.querySelector<HTMLElement>('.man__track')!;
  const village = root.querySelector<HTMLElement>('.man__village');
  const closing = root.querySelector<HTMLElement>('[data-closing]');
  if (reducedMotion()) return;
  onScrollFrame(() => {
    const p = scrollProgress(track_);
    // As palavras acendem nos primeiros 70% do trilho; depois entra o fecho "Vila".
    const lit = Math.round(clamp(p / 0.7) * words.length);
    words.forEach((w, i) => w.classList.toggle('is-on', i < lit));
    closing?.classList.toggle('is-on', p > 0.72);
    village?.style.setProperty('--v', clamp((p - 0.55) / 0.4).toFixed(3));
  });
}
