
import type { NextApiRequest, NextApiResponse } from "next";

const ACUITY_BASE = process.env.ACUITY_BASE_URL || "https://acuityscheduling.com/api/v1";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const { path = "" } = req.query;
  const p = Array.isArray(path) ? path.join("/") : path;

  if (!process.env.ACUITY_USER_ID || !process.env.ACUITY_API_KEY) {
    return res.status(500).json({ success: false, error: { message: "Missing ACUITY envs" }});
  }

  const url = `${ACUITY_BASE}/${p}${req.url?.includes("?") ? req.url?.slice(req.url.indexOf("?")) : ""}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`).toString("base64")}`,
        "User-Agent": "Mentra/diag 1.0",
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    res.status(upstream.status).json({
      success: upstream.ok,
      upstream_status: upstream.status,
      url,
      raw_text: text,
      parsed_json: json,
    });
  } catch (e: any) {
    res.status(502).json({ success: false, error: { message: e?.message || "fetch failed" }, url });
  }
}
