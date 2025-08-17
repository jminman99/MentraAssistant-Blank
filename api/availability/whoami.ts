
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    route_file: __filename,
    dir: __dirname,
    has_util: "yes",
  });
}
