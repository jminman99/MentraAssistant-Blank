
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { db } = await import("./_lib/db.js");
    const { sql } = await import("drizzle-orm");

    const r = await db.execute(sql`select now() as now`);
    return res.status(200).json({ ok: true, now: r.rows?.[0]?.now ?? null });
  } catch (e: any) {
    console.error("DB Ping Error:", e);
    return res.status(500).json({ ok: false, error: e?.message, stack: e?.stack });
  }
}
