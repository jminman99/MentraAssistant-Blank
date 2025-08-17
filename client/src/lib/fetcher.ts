
export async function jsonGet<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // send Clerk cookies
    cache: "no-store",
    ...init,
  });

  const text = await res.text();
  let data: any = null;
  try { 
    data = text ? JSON.parse(text) : null; 
  } catch { 
    /* non-JSON */ 
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      text ||
      `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return data as T;
}
