
import React, { useEffect } from 'react';

interface MentorBookingBarProps {
  appointmentTypeId: string | number;
}

export function MentorBookingBar({ appointmentTypeId }: MentorBookingBarProps) {
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

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <iframe
          src={`https://app.acuityscheduling.com/schedule.php?owner=36474740&appointmentType=${appointmentTypeId}&ref=embedded_csp`}
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
