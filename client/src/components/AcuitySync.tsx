
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  summary: {
    totalAppointments: number;
    syncedAppointments: number;
    skippedAppointments: number;
    syncedDetails?: Array<{
      acuityId: string;
      bookingId: number;
      scheduledDate: string;
      mentorName: string;
    }>;
  };
  message: string;
}

export function AcuitySync() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  const syncAppointments = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await user.getToken();
      const response = await fetch('/api/sync-user-acuity-appointments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result: SyncResult = await response.json();

      if (result.success) {
        setLastSync(result);
        toast({
          title: "Sync Complete",
          description: result.message,
          variant: result.summary.syncedAppointments > 0 ? "default" : "destructive"
        });
      } else {
        throw new Error(result.message || 'Sync failed');
      }

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Sync Acuity Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sync your latest appointments from Acuity Scheduling to see them in your sessions.
        </p>

        <Button 
          onClick={syncAppointments} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>

        {lastSync && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {lastSync.summary.syncedAppointments > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium">Last Sync Result</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold">{lastSync.summary.totalAppointments}</div>
                <div className="text-xs text-muted-foreground">Total Found</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{lastSync.summary.syncedAppointments}</div>
                <div className="text-xs text-muted-foreground">Synced</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{lastSync.summary.skippedAppointments}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
            </div>

            {lastSync.summary.syncedDetails && lastSync.summary.syncedDetails.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Newly Synced:</div>
                {lastSync.summary.syncedDetails.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span>{detail.mentorName}</span>
                    <Badge variant="outline" className="text-xs">
                      {new Date(detail.scheduledDate).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">{lastSync.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
