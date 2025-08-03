
import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

interface MentorBookingBarProps {
  appointmentTypeId: string | number;
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
