
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';

export const config = { 
  runtime: 'nodejs',
  api: {
    bodyParser: false,
  },
};

// Require a token in the query string for security
const WEBHOOK_TOKEN = process.env.ACUITY_WEBHOOK_TOKEN || '';

// Validate webhook token is configured
if (!WEBHOOK_TOKEN) {
  console.error('[ACUITY WEBHOOK] Missing ACUITY_WEBHOOK_TOKEN environment variable');
}

// Constant-time string comparison to prevent timing attacks
function ctEq(a = '', b = '') {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) {
    x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return x === 0;
}

function bad(res: VercelResponse, code: number, msg: string) {
  // Return 200 for webhook stability - prevents Acuity from retrying forever
  return res.status(200).json({ ok: false, error: msg, httpCode: code });
}

async function readRawBody(req: VercelRequest): Promise<{ raw: string; contentType: string }> {
  // Support already-parsed body (some runtimes) or raw stream
  const header = String(req.headers['content-type'] || '').toLowerCase();
  const contentType = header.split(';')[0].trim();

  const existing = (req as any).body;
  if (typeof existing === 'string') return { raw: existing, contentType };
  if (existing && typeof existing === 'object') {
    try { return { raw: JSON.stringify(existing), contentType }; } catch {}
  }

  const chunks: Buffer[] = [];
  const MAX = 256 * 1024; // 256 KB
  let total = 0;
  
  await new Promise((resolve, reject) => {
    req.on('data', (c) => {
      const b = Buffer.from(c);
      total += b.length;
      if (total > MAX) { 
        reject(new Error('payload-too-large')); 
        return; 
      }
      chunks.push(b);
    });
    req.on('end', () => resolve(undefined));
    req.on('error', reject);
  });
  return { raw: Buffer.concat(chunks).toString('utf8'), contentType };
}

// Turn "appointment[id]" into obj.appointment.id = value
function setNested(obj: any, key: string, value: any) {
  const parts: string[] = [];
  key.replace(/]/g, '').split('[').forEach((segment) => {
    const s = segment.trim();
    if (!s) return;
    parts.push(...s.split('.'));
  });
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!Object.prototype.hasOwnProperty.call(cur, p) || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function parseFormEncoded(raw: string): any {
  const out: any = {};
  const params = new URLSearchParams(raw);
  for (const [k, v] of params.entries()) setNested(out, k, v);
  return out;
}

function normalizeAppointment(payload: any) {
  const a = payload?.appointment || payload;

  const id = a?.id ?? a?.appointmentID ?? a?.appointmentId;
  const typeId = a?.appointmentTypeID ?? a?.appointmentTypeId ?? a?.appointment_type_id;
  const dt = a?.datetime ?? a?.date ?? a?.time ?? a?.startTime ?? a?.scheduledDate;
  const dur = a?.duration ?? a?.length ?? 60;
  const tz = a?.timezone ?? a?.timeZone ?? 'UTC';
  const statusRaw = String(a?.status || 'confirmed').toLowerCase();
  const notes = a?.notes ?? a?.note ?? a?.description ?? '';

  const status = (statusRaw === 'canceled' || statusRaw === 'cancelled') ? 'cancelled'
    : (statusRaw === 'rescheduled' ? 'confirmed' : 'confirmed');

  return {
    acuityAppointmentId: id ? String(id) : '',
    appointmentTypeId: typeId != null ? Number(typeId) : NaN,
    datetime: dt ? String(dt) : '',
    duration: Number.isFinite(Number(dur)) ? Number(dur) : 60,
    timezone: String(tz || 'UTC'),
    status,
    notes,
  };
}

async function hydrateFromAcuityIfNeeded(a: any, payload: any) {
  if (a.acuityAppointmentId && a.datetime && Number.isFinite(a.appointmentTypeId)) {
    return a; // Already complete
  }

  const apiUserId = process.env.ACUITY_USER_ID || process.env.ACUITY_API_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;
  if (!apiUserId || !apiKey) {
    console.warn('[ACUITY WEBHOOK] Missing ACUITY_USER_ID / ACUITY_API_KEY; cannot hydrate');
    return a;
  }

  try {
    // Minimal client; Acuity v1 uses Basic auth with userId:apiKey
    const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
    const id = a.acuityAppointmentId || payload?.id || payload?.appointmentID;

    if (!id) return a;

    const resp = await fetch(`https://acuityscheduling.com/api/v1/appointments/${id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!resp.ok) {
      console.warn('[ACUITY WEBHOOK] Hydrate fetch failed', resp.status);
      return a;
    }
    const appt = await resp.json();

    // Fill in missing bits conservatively
    a.acuityAppointmentId = a.acuityAppointmentId || String(appt?.id || '');
    a.appointmentTypeId = Number.isFinite(a.appointmentTypeId) ? a.appointmentTypeId
                          : Number(appt?.appointmentTypeID ?? appt?.appointmentTypeId ?? appt?.appointment_type_id);
    a.datetime = a.datetime || String(appt?.datetime || appt?.time || appt?.startTime || '');
    a.duration = Number.isFinite(Number(a.duration)) ? a.duration : Number(appt?.duration ?? 60);
    a.timezone = a.timezone || appt?.timezone || 'UTC';

    // Grab email/notes if missing
    (a as any).email = (a as any).email || appt?.email || appt?.client?.email || null;
    a.notes = a.notes || appt?.notes || '';

    console.log('[ACUITY WEBHOOK] Hydrated from Acuity API', {
      id: a.acuityAppointmentId, typeId: a.appointmentTypeId, dt: a.datetime, tz: a.timezone
    });
  } catch (e: any) {
    console.warn('[ACUITY WEBHOOK] Exception during hydration', e?.message || e);
  }
  return a;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS headers for consistency
  const { applyCorsHeaders } = await import('./_lib/middleware.js');
  applyCorsHeaders(res, req);

  try {
    if (!['POST', 'HEAD'].includes(req.method!)) return bad(res, 405, 'Method not allowed');
    if (req.method === 'HEAD') return res.status(200).end();

    // Check server configuration first
    if (!WEBHOOK_TOKEN) {
      console.error('[ACUITY WEBHOOK] Missing ACUITY_WEBHOOK_TOKEN');
      return bad(res, 500, 'Server not configured');
    }

    // Normalize incoming token from query/header/body
    let incoming = req.query?.token;
    if (Array.isArray(incoming)) incoming = incoming[0];
    if (!incoming && req.headers['x-acuity-token']) incoming = req.headers['x-acuity-token'] as string;
    incoming = String(incoming || '').trim();

    const configured = String(WEBHOOK_TOKEN).trim();

    console.log('[ACUITY DEBUG VARS]', {
      acuityEnvLen: String(process.env.ACUITY_WEBHOOK_TOKEN || '').length,
      acuityEnvPrefix: String(process.env.ACUITY_WEBHOOK_TOKEN || '').slice(0,6),
      webhookEnvLen: String(process.env.WEBHOOK_TOKEN || '').length,
      webhookEnvPrefix: String(process.env.WEBHOOK_TOKEN || '').slice(0,6),
      configuredPrefix: String(WEBHOOK_TOKEN).slice(0,6),
      configuredLen: String(WEBHOOK_TOKEN).length,
      inPrefix: String(incoming).slice(0,6),
      inLen: String(incoming).length,
      // hex helps catch invisible chars / en-dash vs hyphen issues
      envHex: Buffer.from(String(WEBHOOK_TOKEN)).toString('hex'),
      inHex: Buffer.from(String(incoming)).toString('hex'),
    });

    console.log('[ACUITY DEBUG]', {
      vercelEnv: process.env.VERCEL_ENV,
      hasEnv: !!configured, 
      envLen: configured.length,
      inLen: incoming.length,
      envPrefix: configured.slice(0, 6), 
      inPrefix: incoming.slice(0, 6),
      eq: ctEq(incoming, configured),
    });

    // Verify webhook token using constant-time comparison
    if (!configured) {
      return bad(res, 500, 'Missing ACUITY_WEBHOOK_TOKEN');
    }
    if (!incoming || !ctEq(incoming, configured)) {
      console.warn('[ACUITY WEBHOOK] Unauthorized webhook attempt', { 
        hasToken: !!incoming, 
        tokenPrefix: incoming.slice(0, 6) 
      });
      return bad(res, 401, 'Unauthorized');
    }

    // Log event type if provided
    const eventType = (req.query.event as string) || 'unknown';
    console.log(`[ACUITY WEBHOOK] Event type: ${eventType}`);

    const { raw, contentType } = await readRawBody(req);

    let payload: any;
    if (contentType === 'application/json') {
      try { payload = JSON.parse(raw || '{}'); }
      catch { return bad(res, 400, 'Invalid JSON'); }
    } else if (contentType === 'application/x-www-form-urlencoded') {
      payload = parseFormEncoded(raw || '');
    } else {
      // Heuristic: try JSON, then form
      try { payload = JSON.parse(raw || '{}'); }
      catch { payload = parseFormEncoded(raw || ''); }
    }

    // Handle "single JSON string as key" case
    if (!payload?.appointment && Object.keys(payload || {}).length === 1) {
      const onlyKey = Object.keys(payload)[0];
      if (onlyKey?.startsWith('{') && onlyKey?.endsWith('}')) {
        try {
          const parsed = JSON.parse(onlyKey);
          payload = parsed;
          console.log('[ACUITY WEBHOOK] Recovered JSON-from-key payload:', Object.keys(payload));
        } catch (e) {
          console.warn('[ACUITY WEBHOOK] Failed to parse JSON-from-key payload');
        }
      }
    }

    let a = normalizeAppointment(payload);
    a = await hydrateFromAcuityIfNeeded(a, payload);
    console.log('[ACUITY WEBHOOK] Incoming data:', {
      eventType,
      contentType,
      id: a.acuityAppointmentId,
      typeId: a.appointmentTypeId,
      dt: a.datetime,
      dur: a.duration,
      tz: a.timezone,
      status: a.status
    });
    
    console.log('[ACUITY WEBHOOK] Full payload structure:', {
      hasAppointment: !!payload.appointment,
      appointmentKeys: payload.appointment ? Object.keys(payload.appointment) : [],
      topLevelKeys: Object.keys(payload),
      rawPayload: JSON.stringify(payload, null, 2)
    });

    // Validate required fields
    if (!a.acuityAppointmentId) return bad(res, 400, 'Missing appointment id');
    if (!a.datetime) return bad(res, 400, 'Missing appointment datetime');
    if (!Number.isFinite(a.appointmentTypeId)) return bad(res, 400, 'Missing appointmentTypeId');
    
    // Date safety validation
    const jsDate = new Date(a.datetime);
    if (isNaN(jsDate.getTime())) return bad(res, 400, 'Invalid datetime');

    // Resolve mentor by appointment type
    const orgId = 1; // TODO: derive organization if needed
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    const mentor = mentors.find((m: any) => Number(m.acuityAppointmentTypeId) === Number(a.appointmentTypeId));
    if (!mentor) {
      console.warn('[ACUITY WEBHOOK] mentor not found for appointmentTypeId', a.appointmentTypeId);
      // Return 200 so Acuity doesn't retry forever; log so you can map it later
      return res.status(200).json({ ok: false, error: 'Mentor not found for appointment type' });
    }

    // Extract email from various possible locations in the payload
    let userEmail = null;
    
    // Try different email locations (including hydrated data)
    if (payload?.appointment?.email) {
      userEmail = payload.appointment.email;
    } else if (payload?.email) {
      userEmail = payload.email;
    } else if ((a as any)?.email) {
      userEmail = (a as any).email;
    }
    
    console.log('[ACUITY WEBHOOK] Extracted email:', userEmail);
    
    let menteeId = 0;
    if (userEmail) {
      try {
        const user = await storage.getUserByEmail(userEmail);
        if (user) {
          menteeId = user.id;
          console.log('[ACUITY WEBHOOK] Found user by email:', user.email, 'ID:', user.id);
        } else {
          console.warn('[ACUITY WEBHOOK] No user found for email:', userEmail);
          // Return success but don't create booking - prevents infinite retries
          return res.status(200).json({ 
            ok: false, 
            error: 'User not found', 
            email: userEmail,
            suggestion: 'User needs to register in the system first'
          });
        }
      } catch (e) {
        console.warn('[ACUITY WEBHOOK] Failed to lookup user by email:', e);
        return res.status(200).json({ 
          ok: false, 
          error: 'Database error during user lookup', 
          details: e instanceof Error ? e.message : String(e)
        });
      }
    } else {
      console.warn('[ACUITY WEBHOOK] No email found in payload');
      return res.status(200).json({ 
        ok: false, 
        error: 'No email found in appointment data' 
      });
    }

    const booking = {
      menteeId,
      humanMentorId: mentor.id,
      sessionType: 'individual' as const,
      scheduledDate: new Date(a.datetime),
      duration: a.duration,
      timezone: a.timezone || 'UTC',
      meetingType: 'video' as const,
      sessionGoals: a.notes || 'Acuity webhook',
      status: a.status as 'confirmed' | 'cancelled',
      acuityAppointmentId: a.acuityAppointmentId,
      calendlyEventId: null,
    };

    let result = null;
    try {
      result = await storage.upsertIndividualSessionBooking(booking as any);
    } catch (e) {
      console.warn('[ACUITY WEBHOOK] upsert failed, falling back to create', e instanceof Error ? e.message : e);
      result = await storage.createIndividualSessionBooking(booking as any);
    }

    console.log('[ACUITY WEBHOOK] stored booking', {
      id: result?.id, acuityAppointmentId: result?.acuityAppointmentId,
      mentorId: result?.humanMentorId, menteeId: result?.menteeId
    });

    // Always 200 for webhook stability
    return res.status(200).json({ ok: true, id: result?.id });

  } catch (err: any) {
    console.error('[ACUITY WEBHOOK] error', err?.stack || err);
    // Return 200 so Acuity doesn't spam retries; your logs capture the stack
    return res.status(200).json({ ok: false, error: 'webhook error', details: err?.message || String(err) });
  }
}
