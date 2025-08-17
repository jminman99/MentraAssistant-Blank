
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.headers.get("x-vercel-protection-bypass");
  const expected = process.env.PROTECTION_BYPASS_TOKEN;

  if (token !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"], // protect only API routes
};
