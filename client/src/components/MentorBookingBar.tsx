
import React from 'react';

interface MentorBookingBarProps {
  appointmentTypeId: string | number;
}

export function MentorBookingBar({ appointmentTypeId }: MentorBookingBarProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-700">
          Booking interface for appointment type: {appointmentTypeId}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          This would integrate with Acuity Scheduling or similar booking system.
        </p>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>After booking:</strong> Your appointment will automatically sync to "My Sessions" within a few minutes. 
          If it doesn't appear, please refresh the page or contact support.
        </p>
      </div>
    </div>
  );
}
