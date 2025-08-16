
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';

// Simple TZ date helper (no luxon/dayjs dependency)
function ymdInTz(tz: string, d = new Date()): string {
  // Format yyyy-mm-dd in the target IANA tz
  const parts = new Intl.DateTimeFormat('en-CA', { // en-CA yields YYYY-MM-DD
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${day}`;
}

function asString(q: string | string[] | undefined): string | undefined {
  if (q == null) return undefined;
  return Array.isArray(q) ? q[0] : q;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const appointmentTypeId = asString(req.query.appointmentTypeId);
    const timezone = asString(req.query.timezone) || 'America/Kentucky/Louisville';
    const dateQuery = asString(req.query.date);

    if (!appointmentTypeId) {
      return res.status(400).json({ error: 'appointmentTypeId is required' });
    }

    const apiUserId = process.env.ACUITY_USER_ID;
    const apiKey = process.env.ACUITY_API_KEY;

    if (!apiUserId || !apiKey) {
      return res.status(500).json({ error: 'Acuity API not configured' });
    }

    // Compute target date in the caller's timezone
    const targetDate = dateQuery || ymdInTz(timezone);

    // Defensive date check (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }

    const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');

    const qs = new URLSearchParams({
      appointmentTypeID: appointmentTypeId,
      date: targetDate,
      timezone, // Acuity supports tz as query param
    });

    // Set a hard timeout so lambdas don't hang
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s

    const url = `https://acuityscheduling.com/api/v1/availability/times?${qs.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'User-Agent': 'MentraServer/1.0 (+https://mentra.app)',
      },
      signal: controller.signal,
    }).catch((err: any) => {
      // Fetch-level errors (DNS/timeout/abort)
      throw new Error(`Upstream fetch failed: ${err?.name || 'Error'}${err?.message ? ` - ${err.message}` : ''}`);
    }).finally(() => clearTimeout(timeout));

    let bodyText = await response.text();
    let bodyJson: any = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // leave as text
    }

    if (!response.ok) {
      // Surface upstream status; include upstream body for debugging
      console.error('[ACUITY_AVAILABILITY] Non-OK', {
        status: response.status,
        statusText: response.statusText,
        url,
        // DO NOT log secrets
        body: bodyText?.slice(0, 1000),
      });
      return res.status(response.status).json({
        error: 'Failed to fetch availability',
        upstreamStatus: response.status,
        details: bodyJson || bodyText || null,
      });
    }

    // Success: normalize shape
    return res.status(200).json({
      success: true,
      date: targetDate,
      timezone,
      appointmentTypeId,
      availability: bodyJson ?? bodyText, // prefer JSON
    });

  } catch (error: any) {
    console.error('[ACUITY_AVAILABILITY] Error:', {
      name: error?.name,
      message: error?.message,
    });
    const isAbort = error?.name === 'AbortError';
    return res.status(isAbort ? 504 : 500).json({
      error: isAbort ? 'Upstream timeout' : 'Failed to fetch availability',
      details: error?.message || 'Unknown error',
    });
  }
}
