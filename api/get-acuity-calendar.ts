
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';

function asString(q: string | string[] | undefined): string | undefined {
  if (q == null) return undefined;
  return Array.isArray(q) ? q[0] : q;
}

function monthsBetween(startYmd: string, endYmd: string) {
  const [sy, sm] = startYmd.split('-').map(Number);
  const [ey, em] = endYmd.split('-').map(Number);
  const out: string[] = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2,'0')}`);
    m++; if (m === 13) { m = 1; y++; }
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { appointmentTypeId, timezone = 'America/Kentucky/Louisville', month, start, end } = req.query;
    
    if (!appointmentTypeId || typeof appointmentTypeId !== 'string') {
      return res.status(400).json({ error: 'appointmentTypeId required' });
    }

    // 1) Resolve window
    let startYmd: string, endYmd: string;
    
    if (month && typeof month === 'string') {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'month must be YYYY-MM' });
      }
      startYmd = `${month}-01`;
      const last = new Date(`${startYmd}T00:00:00`);
      last.setMonth(last.getMonth() + 1, 0);
      endYmd = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
    } else if (start && end && typeof start === 'string' && typeof end === 'string') {
      // 2) Validate start/end
      const ymdRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!ymdRe.test(start)) return res.status(400).json({ error: 'start must be YYYY-MM-DD' });
      if (!ymdRe.test(end)) return res.status(400).json({ error: 'end must be YYYY-MM-DD' });
      if (start > end) return res.status(400).json({ error: 'start must be <= end' });
      
      startYmd = start;
      endYmd = end;
    } else {
      // default: current month in caller TZ
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-CA', { 
        timeZone: timezone as string, 
        year: 'numeric', 
        month: '2-digit'
      }).formatToParts(now);
      const y = parts.find(p => p.type === 'year')!.value;
      const m = parts.find(p => p.type === 'month')!.value;
      startYmd = `${y}-${m}-01`;
      const last = new Date(`${startYmd}T00:00:00`);
      last.setMonth(last.getMonth() + 1, 0);
      endYmd = new Intl.DateTimeFormat('en-CA', { 
        timeZone: timezone as string, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit'
      }).format(last);
    }

    const apiUserId = process.env.ACUITY_USER_ID;
    const apiKey = process.env.ACUITY_API_KEY;

    if (!apiUserId || !apiKey) {
      return res.status(500).json({ error: 'Acuity API not configured' });
    }

    const auth = 'Basic ' + Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
    
    const fetchJson = async (url: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      
      try {
        const r = await fetch(url, { 
          headers: { 
            Authorization: auth, 
            Accept: 'application/json',
            'User-Agent': 'MentraServer/1.0' 
          },
          signal: controller.signal
        });
        const t = await r.text();
        const j = t ? JSON.parse(t) : null;
        if (!r.ok) throw new Error(`Acuity ${r.status} ${r.statusText}: ${t?.slice?.(0,200)}`);
        return j;
      } finally {
        clearTimeout(timeout);
      }
    };

    // Get all month keys we need to query
    const monthKeys = monthsBetween(startYmd, endYmd);

    // Fetch dates for each month and merge
    const monthDatesArrays = await Promise.all(monthKeys.map(mk =>
      fetchJson(`https://acuityscheduling.com/api/v1/availability/dates?appointmentTypeID=${appointmentTypeId}&month=${mk}&timezone=${encodeURIComponent(timezone as string)}`)
    ));
    
    const allDates = monthDatesArrays.flat().filter((d: any) => typeof d === 'string');
    const inWindow = new Set(allDates.filter(d => d >= startYmd && d <= endYmd));
    
    if (inWindow.size === 0) {
      return res.status(200).json({
        success: true,
        startDate: startYmd,
        endDate: endYmd,
        timezone,
        appointmentTypeId,
        availability: {}
      });
    }

    // 4) Fetch times for all available dates concurrently
    const dateArray = Array.from(inWindow);
    const timesArrays = await Promise.all(dateArray.map(date =>
      fetchJson(`https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&date=${date}&timezone=${encodeURIComponent(timezone as string)}`)
        .then(times => ({ date, times }))
        .catch(err => {
          console.warn(`Failed to fetch times for ${date}:`, err.message);
          return { date, times: [] };
        })
    ));

    // Build final availability map
    const availability: Record<string, string[]> = {};
    
    // Normalize ISO timestamps and group by date
    const normalizeIso = (s: string) => s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    
    for (const { date, times } of timesArrays) {
      const slots: string[] = [];
      if (Array.isArray(times)) {
        for (const slot of times) {
          const t = slot?.time || slot?.datetime;
          if (t) {
            slots.push(normalizeIso(String(t)));
          }
        }
      }
      if (slots.length > 0) {
        availability[date] = slots;
      }
    }

    // 3) Sort times for each day for stable output
    for (const d of Object.keys(availability)) {
      availability[d].sort(); // ISO strings sort chronologically
    }

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      startDate: startYmd,
      endDate: endYmd,
      timezone,
      appointmentTypeId,
      availability
    });

  } catch (error: any) {
    console.error('[ACUITY_CALENDAR] Error:', {
      name: error?.name,
      message: error?.message,
    });
    const isAbort = error?.name === 'AbortError';
    return res.status(isAbort ? 504 : 500).json({
      error: isAbort ? 'Upstream timeout' : 'Failed to fetch calendar availability',
      details: error?.message || 'Unknown error',
    });
  }
}
