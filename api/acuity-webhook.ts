
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';

export const config = { 
  runtime: 'nodejs',
  api: {
    bodyParser: false,
  },
};

// Require a token in the query string for security
const WEBHOOK_TOKEN = process.env.ACUITY_WEBHOOK_TOKEN || process.env.WEBHOOK_TOKEN || '';

// Validate webhook token is configured
if (!WEBHOOK_TOKEN) {
  console.error('[ACUITY WEBHOOK] Missing ACUITY_WEBHOOK_TOKEN environment variable');
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
  await new Promise((resolve, reject) => {
    req.on('data', (c) => chunks.push(Buffer.from(c)));
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');

    // Check server configuration first
    if (!WEBHOOK_TOKEN) {
      console.error('[ACUITY WEBHOOK] Missing ACUITY_WEBHOOK_TOKEN');
      return bad(res, 500, 'Server not configured');
    }

    // Verify webhook token (required for security)
    const token = req.query.token as string;
    if (!token || token !== WEBHOOK_TOKEN) {
      console.warn('[ACUITY WEBHOOK] Unauthorized webhook attempt', { 
        token: token ? `${token.substring(0, 4)}...` : 'none',
        hasToken: !!WEBHOOK_TOKEN 
      });
      return bad(res, 401, 'Invalid or missing token');
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

    const a = normalizeAppointment(payload);
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
    
    // Try different email locations
    if (payload?.appointment?.email) {
      userEmail = payload.appointment.email;
    } else if (payload?.email) {
      userEmail = payload.email;
    } else if (a?.email) {
      userEmail = a.email;
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
