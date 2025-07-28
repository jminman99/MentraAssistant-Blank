
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Debug() {
  const [dbResult, setDbResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDbTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-db');
      const data = await response.json();
      setDbResult(data);
    } catch (error) {
      setDbResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Debug Dashboard</h1>
          <p className="text-slate-600">Debug tools and system diagnostics</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection Test</CardTitle>
              <CardDescription>
                Test the database connection and query basic tables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runDbTest} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Database Connection'}
              </Button>
              
              {dbResult && (
                <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                  <h4 className="font-semibold mb-2">Result:</h4>
                  <pre className="text-sm overflow-auto max-h-96">
                    {JSON.stringify(dbResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current application status and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-600">Environment:</span>
                  <Badge variant="outline" className="ml-2">
                    {process.env.NODE_ENV || 'development'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Build Mode:</span>
                  <Badge variant="outline" className="ml-2">
                    {import.meta.env.MODE || 'unknown'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
