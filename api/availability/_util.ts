
const ACUITY_BASE = 'https://acuityscheduling.com/api/v1';

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function acuityFetch(path: string, abortSignal?: AbortSignal) {
  const user = requireEnv('ACUITY_USER_ID');
  const key = requireEnv('ACUITY_API_KEY');
  const auth = 'Basic ' + Buffer.from(`${user}:${key}`).toString('base64');

  const r = await fetch(`${ACUITY_BASE}${path}`, {
    headers: {
      Authorization: auth,
      Accept: 'application/json',
      'User-Agent': 'Mentra/availability 1.0',
    },
    signal: abortSignal,
    method: 'GET',
  });

  const text = await r.text();
  let json: any = null;
  try { 
    json = text ? JSON.parse(text) : null; 
  } catch { 
    /* leave null */ 
  }

  if (!r.ok) {
    const snippet = text?.slice?.(0, 240) ?? '';
    const err = new Error(`Upstream ${r.status} ${r.statusText}: ${snippet}`);
    (err as any).status = r.status;
    throw err;
  }

  return json;
}

export function jsonError(res: any, status: number, message: string, details?: any) {
  res.status(status).json({ success: false, error: message, details });
}
