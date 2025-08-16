
import { Response } from 'express';
import { applyCorsHeaders } from './_lib/middleware.js';

const asString = (q: unknown) => (Array.isArray(q) ? q[0] : q) as string | undefined;

export default async function handler(req: any, res: Response) {
  applyCorsHeaders(res, req);

  // Preflight
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  // Read query
  const monthParam = asString(req.query.month);          // Accepts "08" or "2025-08"
  const yearParam  = asString(req.query.year);           // Optional legacy style
  const appointmentTypeId = asString(req.query.appointmentTypeId);
  const calendarId = asString(req.query.calendarId) || undefined;
  const timezone   = asString(req.query.timezone) || 'America/Kentucky/Louisville';

  // Validate required
  if (!appointmentTypeId) {
    return res.status(400).json({ success: false, message: 'Missing required: appointmentTypeId' });
  }

  // Build YYYY-MM for Acuity (supports either month+year or YYYY-MM)
  let monthYYYYMM: string | null = null;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    monthYYYYMM = monthParam;
  } else if (monthParam && yearParam && /^\d{1,2}$/.test(monthParam) && /^\d{4}$/.test(yearParam)) {
    const m = String(monthParam).padStart(2, '0');
    monthYYYYMM = `${yearParam}-${m}`;
  } else if (monthParam && !yearParam && /^\d{1,2}$/.test(monthParam)) {
    // If only "8" or "08" is provided, default to current year in caller TZ
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric' }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value ?? String(new Date().getFullYear());
    monthYYYYMM = `${y}-${String(monthParam).padStart(2, '0')}`;
  } else {
    // Default: current YYYY-MM in caller TZ
    const nowParts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' })
      .formatToParts(new Date());
    const y = nowParts.find(p => p.type === 'year')!.value;
    const m = nowParts.find(p => p.type === 'month')!.value;
    monthYYYYMM = `${y}-${m}`;
  }

  // Final validation
  if (!/^\d{4}-\d{2}$/.test(monthYYYYMM)) {
    return res.status(400).json({ success: false, message: 'month must be YYYY-MM (or supply numeric month + year)' });
  }

  try {
    const apiUserId = process.env.ACUITY_USER_ID;
    const apiKey    = process.env.ACUITY_API_KEY;
    if (!apiUserId || !apiKey) {
      return res.status(500).json({ success: false, message: 'Acuity API not configured' });
    }

    const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');

    const qs = new URLSearchParams({
      appointmentTypeID: appointmentTypeId,
      month: monthYYYYMM,           // <- canonical per Acuity
      timezone,                     // <- include tz
    });
    if (calendarId) qs.set('calendarID', calendarId);

    // Timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const url = `https://acuityscheduling.com/api/v1/availability/dates?${qs.toString()}`;
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'User-Agent': 'MentraServer/1.0 (+https://mentra.app)',
      },
      signal: controller.signal,
    }).catch((err: any) => {
      throw new Error(`Upstream fetch failed: ${err?.name || 'Error'}${err?.message ? ` - ${err.message}` : ''}`);
    }).finally(() => clearTimeout(timeout));

    const text = await upstream.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* leave as text */ }

    if (!upstream.ok) {
      const status = upstream.status;
      const map: Record<number, string> = {
        401: 'Invalid Acuity API credentials',
        403: 'Acuity API access denied',
        404: 'Appointment type not found',
        429: 'Rate limit exceeded - please try again later',
        500: 'Acuity server error',
      };
      console.error('[ACUITY_DATES] Non-OK', { status, statusText: upstream.statusText, url, body: text?.slice(0, 1000) });
      return res.status(status).json({
        success: false,
        error: map[status] || 'Failed to fetch available dates',
        upstreamStatus: status,
        details: json || text || null,
      });
    }

    // Defensive: expect an array of YYYY-MM-DD
    const availableDates: string[] = Array.isArray(json)
      ? json.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];

    const availableDatesMap: Record<string, true> = {};
    for (const d of availableDates) availableDatesMap[d] = true;

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      month: monthYYYYMM,          // <- consistent type
      timezone,
      appointmentTypeId,
      calendarId: calendarId || null,
      availableDates,
      availableDatesMap,           // O(1) lookup for UI
    });

  } catch (error: any) {
    console.error('[ACUITY_DATES] Error:', { name: error?.name, message: error?.message });
    const isAbort = error?.name === 'AbortError';
    return res.status(isAbort ? 504 : 500).json({
      success: false,
      error: isAbort ? 'Upstream timeout' : 'Failed to fetch available dates',
      details: error?.message || 'Unknown error',
    });
  }
}
