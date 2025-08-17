
import { NextResponse } from "next/server";

export function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Surrogate-Control', 'no-store');
}

export async function acuityFetch(path: string) {
  const base = process.env.ACUITY_BASE_URL || "https://acuityscheduling.com/api/v1";
  const user = process.env.ACUITY_USER_ID!;
  const key = process.env.ACUITY_API_KEY!;
  
  const res = await fetch(`${base}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`,
      "User-Agent": "Mentra/availability 1.0",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Acuity API error ${res.status}: ${errorText}`);
  }

  return res.json();
}
