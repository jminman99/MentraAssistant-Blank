export async function acuityFetch(path: string, init?: RequestInit) {
  const base = process.env.ACUITY_BASE_URL || "https://acuityscheduling.com/api/v1";
  const user = process.env.ACUITY_USER_ID;
  const key = process.env.ACUITY_API_KEY;

  if (!user || !key) {
    const err: any = new Error("Missing ACUITY_USER_ID/ACUITY_API_KEY");
    err.code = "CONFIG_MISSING";
    throw err;
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`,
      "User-Agent": "Mentra/availability 1.0",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* leave json null */ }

  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }

  return json;
}

export function noStore(resLike: { setHeader?: Function }) {
  try { resLike?.setHeader?.("Cache-Control", "no-store"); } catch {}
}