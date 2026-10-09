/**
 * Limite de tentativas por IP, em memória. Cada instância da função na Vercel tem
 * a sua contagem, então isto freia abuso simples (robôs, tentativa e erro de senha)
 * mas não substitui uma regra de rate limit no Firewall da Vercel.
 */
const buckets = new Map<string, Map<string, { n: number; reset: number }>>();

export function clientIp(request: Request) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  return request.headers.get('x-real-ip') || fwd.split(',')[0].trim() || 'desconhecido';
}

/** Conta uma tentativa e diz se ainda está dentro do limite. */
export function hit(name: string, key: string, max: number, windowMs: number) {
  const now = Date.now();
  let bucket = buckets.get(name);
  if (!bucket) buckets.set(name, (bucket = new Map()));
  if (bucket.size > 5000) for (const [k, v] of bucket) if (v.reset < now) bucket.delete(k);
  const cur = bucket.get(key);
  if (!cur || cur.reset < now) {
    bucket.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  cur.n++;
  return cur.n <= max;
}

export function clear(name: string, key: string) {
  buckets.get(name)?.delete(key);
}
