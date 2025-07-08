import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface GoogleCalendarButtonProps {
  isConnected?: boolean;
  onConnect?: () => void;
  className?: string;
}

export default function GoogleCalendarButton({ 
  isConnected = false, 
  onConnect,
  className = '' 
}: GoogleCalendarButtonProps) {
  const { user } = useAuth();

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    } else {
      // Default: redirect to Google OAuth
      window.location.href = '/api/google/connect';
    }
  };

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <Check className="h-4 w-4" />
        <span className="text-sm">Google Calendar Connected</span>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleConnect}
      variant="outline"
      className={`flex items-center gap-2 ${className}`}
    >
      <Calendar className="h-4 w-4" />
      Connect Google Calendar
    </Button>
  );
}