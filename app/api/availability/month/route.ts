
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { acuityFetch } from '../_util';

export const runtime = 'nodejs';

const Q = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/),
  timezone: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({
      appointmentTypeId: url.searchParams.get('appointmentTypeId') ?? '',
      timezone: url.searchParams.get('timezone') ?? '',
      month: url.searchParams.get('month') ?? '',
    });
    if (!parsed.success) {
      return NextResponse.json({ success:false, error:{ message:'Invalid query', issues: parsed.error.issues }}, { status:400 });
    }

    const { appointmentTypeId, timezone, month } = parsed.data;

    const upstream = await acuityFetch(
      `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(month)}&timezone=${encodeURIComponent(timezone)}`
    );

    const data: string[] = Array.isArray(upstream)
      ? upstream.map((d:any) => d?.date ?? d).filter(Boolean)
      : Array.isArray(upstream?.dates) ? upstream.dates : [];

    return NextResponse.json({ success:true, data, cached:false, timestamp: new Date().toISOString() });
  } catch (e:any) {
    console.error('[availability/month] error', e);
    return NextResponse.json({ success:false, error:{ message: e?.message || 'Upstream error' }}, { status:502 });
  }
}
