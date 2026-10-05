/**
 * Efeitos globais: revelação no scroll, parallax de cursor e de scroll,
 * CTA magnético, cursor de apoio e header que se esconde.
 * Tudo anima só transform/opacity (compositor) e respeita reduced motion.
 */
import { reducedMotion, finePointer, lerp, onFrame, onScrollFrame } from './env';

export function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window) || reducedMotion()) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.01 },
  );
  els.forEach((el) => io.observe(el));
}

/** Elementos [data-depth] dentro de [data-parallax-scope] seguem o mouse com intensidades diferentes. */
export function initPointerParallax() {
  if (reducedMotion() || !finePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-parallax-scope]').forEach((scope) => {
    scope.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => el.style.setProperty('--d', el.dataset.depth!));
    let tx = 0, ty = 0, x = 0, y = 0, visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(scope);
    scope.addEventListener('pointermove', (e) => {
      const r = scope.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    });
    scope.addEventListener('pointerleave', () => (tx = ty = 0));
    onFrame(() => {
      if (!visible) return;
      x = lerp(x, tx, 0.08);
      y = lerp(y, ty, 0.08);
      scope.style.setProperty('--px', x.toFixed(4));
      scope.style.setProperty('--py', y.toFixed(4));
    });
  });
}

/** Parallax leve de scroll: [data-scroll-speed] desloca em Y proporcional ao scroll. */
export function initScrollParallax() {
  if (reducedMotion()) return;
  const els = [...document.querySelectorAll<HTMLElement>('[data-scroll-speed]')];
  if (!els.length) return;
  onScrollFrame(() => {
    const y = window.scrollY;
    if (y > window.innerHeight * 1.5) return;
    for (const el of els) el.style.setProperty('--sy', `${(-y * Number(el.dataset.scrollSpeed)).toFixed(1)}px`);
  });
}

/** CTA magnético: o botão é puxado suavemente na direção do cursor. */
export function initMagnetic() {
  if (reducedMotion() || !finePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = 0.28;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * strength).toFixed(1)}px`);
      el.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * strength).toFixed(1)}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    });
  });
}

/** Cursor de apoio: um ponto Patinha que segue o mouse e cresce sobre elementos interativos. Não substitui o cursor do sistema. */
export function initCursor() {
  if (reducedMotion() || !finePointer()) return;
  const dot = document.createElement('div');
  dot.className = 'pv-cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  let tx = -100, ty = -100, x = -100, y = -100;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    const t = e.target as Element | null;
    dot.classList.toggle('is-hover', !!t?.closest('a, button, label, [data-cat], .plan'));
  }, { passive: true });
  document.addEventListener('pointerleave', () => dot.classList.add('is-out'));
  document.addEventListener('pointerenter', () => dot.classList.remove('is-out'));
  onFrame(() => {
    x = lerp(x, tx, 0.22);
    y = lerp(y, ty, 0.22);
    dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });
}

/** Header ganha fundo ao rolar e se esconde ao descer (volta ao subir). */
export function initHeader() {
  const h = document.querySelector<HTMLElement>('[data-header]');
  if (!h) return;
  let last = window.scrollY;
  const update = () => {
    const y = window.scrollY;
    h.classList.toggle('is-scrolled', y > 24);
    h.classList.toggle('is-hidden', y > last && y > window.innerHeight * 0.6 && !document.querySelector('dialog[open]'));
    last = y;
  };
  window.addEventListener('scroll', update, { passive: true });
  h.addEventListener('focusin', () => h.classList.remove('is-hidden'));
  update();
}
