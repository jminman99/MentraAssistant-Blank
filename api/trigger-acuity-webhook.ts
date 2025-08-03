
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, appointmentTypeId } = req.body;

    if (!email || !appointmentTypeId) {
      return res.status(400).json({ error: 'Email and appointmentTypeId required' });
    }

    // Create mock webhook payload
    const mockWebhookPayload = {
      action: 'appointment.scheduled',
      appointment: {
        id: `test-${Date.now()}`,
        appointmentTypeID: appointmentTypeId.toString(),
        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration: 60,
        email: email,
        firstName: 'Test',
        lastName: 'User',
        notes: 'Test appointment from trigger endpoint'
      }
    };

    console.log('[TRIGGER_WEBHOOK] Sending mock webhook:', mockWebhookPayload);

    // Call our own webhook endpoint
    const webhookResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:5000'}/api/acuity-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookPayload)
    });

    const webhookResult = await webhookResponse.json();

    console.log('[TRIGGER_WEBHOOK] Webhook response:', webhookResult);

    return res.status(200).json({
      success: true,
      mockPayload: mockWebhookPayload,
      webhookResponse: webhookResult
    });

  } catch (error) {
    console.error('[TRIGGER_WEBHOOK] Error:', error);
    return res.status(500).json({
      error: 'Failed to trigger webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
