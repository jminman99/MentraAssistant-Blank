
import React, { useEffect, useRef } from 'react';
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
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the Acuity embed script
    const loadAcuityScript = () => {
      return new Promise<void>((resolve) => {
        if (window.AcuityScheduling) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://embed.acuityscheduling.com/js/embed.js';
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const initializeEmbed = async () => {
      await loadAcuityScript();
      
      if (embedRef.current && window.AcuityScheduling) {
        // Clear any existing content
        embedRef.current.innerHTML = '';
        
        // Initialize the embed
        window.AcuityScheduling.generate({
          schedulingPage: `https://app.acuityscheduling.com/schedule.php?owner=36474740&appointmentType=${appointmentTypeId}`,
          element: embedRef.current,
          checkAvailability: true,
          skipHeaderFooter: true,
          fieldValues: {
            'email': user?.primaryEmailAddress?.emailAddress || '',
            'firstName': user?.firstName || '',
            'lastName': user?.lastName || ''
          }
        });
      }
    };

    if (user) {
      initializeEmbed();
    }

    // Cleanup function
    return () => {
      if (embedRef.current) {
        embedRef.current.innerHTML = '';
      }
    };
  }, [appointmentTypeId, user]);

  console.log('[MENTOR_BOOKING_BAR] Initializing Acuity embed for appointment type:', appointmentTypeId);

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div 
          ref={embedRef}
          className="w-full min-h-[600px] acuity-embed-container"
          style={{ minHeight: '600px' }}
        >
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading scheduling interface...</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extend Window interface to include AcuityScheduling
declare global {
  interface Window {
    AcuityScheduling: {
      generate: (options: {
        schedulingPage: string;
        element: HTMLElement;
        checkAvailability?: boolean;
        skipHeaderFooter?: boolean;
        fieldValues?: Record<string, string>;
      }) => void;
    };
  }
}
