export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Progresso 0..1 de um elemento alto passando pela viewport (para seções sticky). */
export function scrollProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const range = r.height - window.innerHeight;
  return range <= 0 ? 0 : clamp(-r.top / range);
}

/** Um único loop de rAF compartilhado; cada efeito registra sua função de frame. */
const ticks = new Set<() => void>();
let running = false;
function loop() {
  ticks.forEach((t) => t());
  if (ticks.size) requestAnimationFrame(loop);
  else running = false;
}
export function onFrame(fn: () => void) {
  ticks.add(fn);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
  return () => ticks.delete(fn);
}

/** Executa fn no próximo frame só quando houve scroll/resize (evita leituras de layout ociosas). */
const scrollFns = new Set<() => void>();
let scheduled = false;
const flush = () => {
  scheduled = false;
  scrollFns.forEach((f) => f());
};
const schedule = () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(flush);
  }
};
let listening = false;
export function onScrollFrame(fn: () => void) {
  scrollFns.add(fn);
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }
  schedule();
}
