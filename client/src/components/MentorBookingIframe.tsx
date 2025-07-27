
import { useEffect } from 'react';

interface MentorBookingIframeProps {
  appointmentTypeId: number;
}

export function MentorBookingIframe({ appointmentTypeId }: MentorBookingIframeProps) {
  useEffect(() => {
    // Load Acuity embed script
    const script = document.createElement('script');
    script.src = 'https://embed.acuityscheduling.com/js/embed.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // Only add if not already present
    if (!document.querySelector('script[src="https://embed.acuityscheduling.com/js/embed.js"]')) {
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup script on unmount if needed
      const existingScript = document.querySelector('script[src="https://embed.acuityscheduling.com/js/embed.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Validate appointmentTypeId
  if (!appointmentTypeId || appointmentTypeId <= 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-slate-600 text-lg">No mentor selected.</p>
      </div>
    );
  }

  const acuityUrl = `https://app.acuityscheduling.com/schedule.php?owner=36474740&appointmentType=${appointmentTypeId}`;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <iframe
        src={acuityUrl}
        title="Schedule Appointment"
        width="100%"
        height="800"
        frameBorder="0"
        className="w-full"
        style={{ minHeight: '800px' }}
      />
    </div>
  );
}

export default MentorBookingIframe;
