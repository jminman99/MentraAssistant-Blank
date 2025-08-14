
import React from "react";

export default function MentorBookingEmbed({ ownerId }: { ownerId: string }) {
  return (
    <iframe
      src={`https://app.acuityscheduling.com/schedule.php?owner=${ownerId}&embed=1`}
      width="100%"
      height="800"
      frameBorder="0"
      title="Mentor Booking"
      allow="payment"
      className="w-full min-h-[600px]"
    />
  );
}
