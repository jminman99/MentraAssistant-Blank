
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export function AcuityDebugPanel() {
  const { user } = useUser();
  const [appointmentTypeId, setAppointmentTypeId] = useState('67890');
  const [isLoading, setIsLoading] = useState(false);

  const testWebhook = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      toast({
        title: "Error",
        description: "User email not available",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/trigger-acuity-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.primaryEmailAddress.emailAddress,
          appointmentTypeId: appointmentTypeId
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Test webhook triggered successfully! Check upcoming sessions.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to trigger webhook",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger test webhook",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <Card className="mt-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">🧪 Acuity Debug Panel (Dev Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="appointmentTypeId">Appointment Type ID</Label>
          <Input
            id="appointmentTypeId"
            value={appointmentTypeId}
            onChange={(e) => setAppointmentTypeId(e.target.value)}
            placeholder="67890"
          />
        </div>
        <div className="text-xs text-gray-600">
          <p><strong>User Email:</strong> {user?.primaryEmailAddress?.emailAddress || 'Not available'}</p>
          <p><strong>Test Action:</strong> This will create a mock booking that should appear in "Upcoming Sessions"</p>
        </div>
        <Button 
          onClick={testWebhook} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test Webhook Integration'}
        </Button>
      </CardContent>
    </Card>
  );
}
