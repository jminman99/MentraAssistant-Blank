import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

interface MentorBookingBarProps {
  appointmentTypeId: string | number;
}

// Convert ISO-like string to Acuity format by preserving the original offset.
// Accepts e.g. "2025-08-20T15:00:00-04:00", "2025-08-20T15:00-04:00", or "...Z".
function toAcuityDateTimePreserveOffset(iso: string): string {
  // Ensure we have seconds
  // Split date/time and offset
  const m = iso.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?([Zz]|[+\-]\d{2}:?\d{2})?$/
  );
  if (!m) {
    // Fallback: try native Date parse and format as UTC
    const d = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid datetime: ${iso}`);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00+0000`;
  }

  const [, ymd, hm, s, offRaw] = m;
  const seconds = s ?? '00';
  let off = offRaw ?? 'Z';

  if (off === 'Z' || off === 'z') off = '+0000';
  else {
    // remove colon in offset if present, e.g. "-04:00" -> "-0400"
    off = off.replace(':', '');
  }

  return `${ymd}T${hm}:${seconds}${off}`;
}


export function MentorBookingBar({ appointmentTypeId }: MentorBookingBarProps) {
  const { user } = useUser();
  useEffect(() => {
    // Load the Acuity embed script only once
    if (!document.querySelector('script[src="https://embed.acuityscheduling.com/js/embed.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://embed.acuityscheduling.com/js/embed.js';
      script.type = 'text/javascript';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Get the correct base URL for webhook callbacks
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return import.meta.env.PROD ? 'https://mentra-assistant-blank.vercel.app' : 'http://localhost:5000';
  };

  const baseUrl = getBaseUrl();
  const iframeUrl = `https://app.acuityscheduling.com/schedule.php?owner=36474740&appointmentType=${appointmentTypeId}&email=${encodeURIComponent(user?.primaryEmailAddress?.emailAddress || '')}&firstName=${encodeURIComponent(user?.firstName || '')}&lastName=${encodeURIComponent(user?.lastName || '')}&ref=embedded_csp&domain=${encodeURIComponent(baseUrl)}`;

  console.log('[MENTOR_BOOKING_BAR] Using iframe URL:', iframeUrl);

  // This function is not used in the provided snippet but is assumed to be part of the original code.
  // If it were intended to be used, its definition would be here.
  // For example:
  // function toAcuityDateTime(datetime: string): string {
  //   // Original implementation that was replaced
  //   const date = new Date(datetime);
  //   const offset = date.getTimezoneOffset();
  //   const offsetHours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
  //   const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
  //   const sign = offset > 0 ? '-' : '+';
  //   const formattedOffset = `${sign}${offsetHours}${offsetMinutes}`;
  //   const isoString = date.toISOString().replace('Z', '');
  //   return `${isoString}${formattedOffset}`;
  // }


  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <iframe
          src={iframeUrl}
          title="Schedule Appointment"
          width="100%"
          height="800"
          frameBorder="0"
          allow="payment"
          className="w-full min-h-[600px]"
        />
      </div>
    </div>
  );
}