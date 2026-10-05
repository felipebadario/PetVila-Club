/**
 * Camada única de tracking. Os componentes só chamam track(); daqui o evento
 * vai para dataLayer (GTM/GA4) e, se carregados, gtag e Meta Pixel.
 * Trocar ou adicionar ferramentas mexe só neste arquivo.
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Mapeia eventos internos para os nomes padrão das plataformas. */
const META_EVENTS: Record<string, string> = { generate_lead: 'Lead' };

export function track(event: string, params: Params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  window.gtag?.('event', event, params);
  const metaEvent = META_EVENTS[event];
  if (metaEvent) window.fbq?.('track', metaEvent, params);
  else window.fbq?.('trackCustom', event, params);
  if (import.meta.env.DEV) console.debug('[track]', event, params);
}

/* ---------- Origem do lead ---------- */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  referrer?: string;
  landing_page?: string;
};

const STORAGE_KEY = 'pv_attribution';

/** Guarda a origem da visita (last-touch dentro da sessão). Chamar no carregamento. */
export function captureAttribution(): Attribution {
  const params = new URLSearchParams(location.search);
  const hasUtm = UTM_KEYS.some((k) => params.get(k));
  const stored = readAttribution();
  if (!hasUtm && stored.landing_page) return stored;

  const next: Attribution = {
    landing_page: location.pathname + location.search,
    referrer: document.referrer ? new URL(document.referrer).hostname : undefined,
  };
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) next[k] = v.slice(0, 150);
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function readAttribution(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
