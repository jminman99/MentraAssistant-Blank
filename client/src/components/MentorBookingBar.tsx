import { useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

interface MentorBookingBarProps {
  appointmentTypeId: number;
}

export function MentorBookingBar({ appointmentTypeId }: MentorBookingBarProps) {
  const { user } = useUser();
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !appointmentTypeId) return;

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

        const ownerId = import.meta.env.VITE_ACUITY_USER_ID;

        if (!ownerId) {
          console.error('[MENTOR_BOOKING_BAR] VITE_ACUITY_USER_ID environment variable not configured');
          embedRef.current.innerHTML = '<div class="p-4 text-red-600">Scheduling not configured. Please contact support.</div>';
          return;
        }

        // Initialize the embedded widget - this keeps users on your site
        window.AcuityScheduling.generate({
          schedulingPage: `https://app.acuityscheduling.com/schedule.php?owner=${ownerId}&appointmentType=${appointmentTypeId}`,
          element: embedRef.current,
          checkAvailability: true,
          skipHeaderFooter: true,
          fieldValues: {
            'email': user?.primaryEmailAddress?.emailAddress || '',
            'firstName': user?.firstName || '',
            'lastName': user?.lastName || ''
          }
        });

        // Listen for booking completion events
        window.addEventListener('message', (event) => {
          if (event.origin !== 'https://embed.acuityscheduling.com') return;

          if (event.data?.type === 'acuity-appointment-booked') {
            console.log('[MENTOR_BOOKING_BAR] Appointment booked:', event.data);
            // The webhook will handle creating the booking in your database
            // Just show a success message or redirect
            window.location.href = '/booking-confirmation';
          }
        });
      }
    };

    initializeEmbed();

    return () => {
      if (embedRef.current) {
        embedRef.current.innerHTML = '';
      }
    };
  }, [appointmentTypeId, user]);

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please sign in to schedule an appointment.
      </div>
    );
  }

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