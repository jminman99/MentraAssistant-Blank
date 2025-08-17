
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { acuityFetch } from '../_util';

export const runtime = 'nodejs';

const Q = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/),
  timezone: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({
      appointmentTypeId: url.searchParams.get('appointmentTypeId') ?? '',
      timezone: url.searchParams.get('timezone') ?? '',
      date: url.searchParams.get('date') ?? '',
    });
    if (!parsed.success) {
      return NextResponse.json({ success:false, error:{ message:'Invalid query', issues: parsed.error.issues }}, { status:400 });
    }

    const { appointmentTypeId, timezone, date } = parsed.data;

    const times = await acuityFetch(
      `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
    );

    const data: string[] = (times || []).map((t:any) => normalizeIso(t.time || t.datetime));

    return NextResponse.json({ success:true, data, cached:false, timestamp: new Date().toISOString() });
  } catch (e:any) {
    console.error('[availability/day] error', e);
    return NextResponse.json({ success:false, error:{ message: e?.message || 'Upstream error' }}, { status:502 });
  }
}
