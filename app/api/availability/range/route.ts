
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { acuityFetch } from '../_util';

export const runtime = 'nodejs';

const Q = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/),
  timezone: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({
      appointmentTypeId: url.searchParams.get('appointmentTypeId') ?? '',
      timezone: url.searchParams.get('timezone') ?? '',
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
    });
    if (!parsed.success) {
      return NextResponse.json({ success:false, error:{ message:'Invalid query', issues: parsed.error.issues }}, { status:400 });
    }

    const { appointmentTypeId, timezone, startDate, endDate } = parsed.data;

    const monthKey = startDate.slice(0,7);
    const upstreamDates = await acuityFetch(
      `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(monthKey)}&timezone=${encodeURIComponent(timezone)}`
    );

    const allDates: string[] = Array.isArray(upstreamDates)
      ? upstreamDates.map((d:any) => d?.date ?? d).filter(Boolean)
      : Array.isArray(upstreamDates?.dates) ? upstreamDates.dates : [];

    const wanted = allDates.filter(d => d >= startDate && d <= endDate);
    const times: Record<string, string[]> = {};

    await Promise.all(wanted.map(async d => {
      try {
        const t = await acuityFetch(
          `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(d)}&timezone=${encodeURIComponent(timezone)}`
        );
        times[d] = (t || []).map((row:any) => normalizeIso(row.time || row.datetime));
      } catch (e:any) {
        console.warn('[availability/range] day fetch failed', d, e?.message);
        times[d] = [];
      }
    }));

    return NextResponse.json({ success:true, data: { dates: wanted, times }, cached:false, timestamp: new Date().toISOString() });
  } catch (e:any) {
    console.error('[availability/range] error', e);
    return NextResponse.json({ success:false, error:{ message: e?.message || 'Upstream error' }}, { status:502 });
  }
}
