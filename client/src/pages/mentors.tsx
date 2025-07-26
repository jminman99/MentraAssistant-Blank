import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, DollarSign, Clock, Video } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Mentors() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/human-mentors'],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      if (!getToken) {
        throw new Error('No authentication available');
      }

      // Try multiple token templates for compatibility
      let token: string | null = null;
      try {
        token = await getToken({ template: 'mentra-api' });
      } catch {
        try {
          token = await getToken({ template: 'default' });
        } catch {
          token = await getToken();
        }
      }
      
      if (!token) {
        throw new Error('No Clerk token (check JWT template name in Clerk dashboard)');
      }

      const res = await fetch('/api/human-mentors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const raw = await res.text().catch(() => '');
      if (!res.ok) {
        try {
          const j = JSON.parse(raw);
          throw new Error(j.message || j.error || `HTTP ${res.status}`);
        } catch {
          throw new Error(raw || `HTTP ${res.status}`);
        }
      }

      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Non-JSON response: ${raw}`);
      }

      if (json?.success === false) {
        throw new Error(json.message || json.error || 'Failed to load mentors');
      }
      return json;
    },
  });
  
  const mentors = Array.isArray(data?.data) ? data.data : [];

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Sign In Required</h1>
          <p className="text-slate-600">Please sign in to view available mentors.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading mentors...</div>;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Error Loading Mentors</h1>
          <p className="text-slate-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Experienced Guides</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Connect with experienced mentors for personalized guidance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentors.map((mentor: any) => (
          <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={mentor.user?.profileImage} />
                  <AvatarFallback>
                    {mentor.user?.firstName?.[0]}{mentor.user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {mentor.user?.firstName} {mentor.user?.lastName}
                  </CardTitle>
                  <CardDescription>{mentor.expertise}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                {mentor.bio}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>{mentor.rating || 'New'}</span>
                  <span className="text-slate-500">({mentor.totalSessions} sessions)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">
                    Included in Plan
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>30 min sessions</span>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{mentor.experience}</Badge>
                {mentor.isActive && <Badge variant="outline">Available</Badge>}
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full"
                  onClick={() => setLocation('/individual-booking')}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Book Session
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mentors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No mentors available at the moment.</p>
        </div>
      )}
    </div>
  );
}