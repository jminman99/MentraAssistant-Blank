
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    ACUITY_USER_ID_present: Boolean(process.env.ACUITY_USER_ID),
    ACUITY_API_KEY_present: Boolean(process.env.ACUITY_API_KEY),
    ACUITY_BASE_URL: process.env.ACUITY_BASE_URL || "https://acuityscheduling.com/api/v1",
    node_env: process.env.NODE_ENV,
    vercel_region: process.env.VERCEL_REGION || null,
    vercel_url: process.env.VERCEL_URL || null,
  });
}
