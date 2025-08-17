import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    route_file: __filename,
    dir: __dirname,
    has_util: "yes",
  });
}