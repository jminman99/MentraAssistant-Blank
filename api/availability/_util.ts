
// app/api/availability/_util.ts
export async function acuityFetch(path: string, init?: RequestInit) {
  const base = process.env.ACUITY_BASE_URL || "https://acuityscheduling.com/api/v1";
  const user = process.env.ACUITY_USER;
  const key  = process.env.ACUITY_KEY;

  if (!user || !key) {
    const err = new Error("Missing ACUITY_USER/ACUITY_KEY");
    (err as any).code = "CONFIG_MISSING";
    throw err;
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    // Force Node runtime to use standard fetch
    cache: "no-store",
    headers: {
      ...(init?.headers || {}),
      Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* leave json null */ }

  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).body = json ?? text;
    throw err;
  }

  return json;
}

export function jsonError(res: any, status: number, message: string, details?: any) {
  res.status(status).json({ 
    success: false, 
    error: { 
      message, 
      ...(details ? { details } : {}) 
    } 
  });
}
