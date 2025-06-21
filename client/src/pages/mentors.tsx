import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, DollarSign, Clock, Video } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Mentors() {
  const [, setLocation] = useLocation();
  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ['/api/human-mentors'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading mentors...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Human Mentors</h1>
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
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>${mentor.hourlyRate}/hr</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{mentor.defaultSessionDuration || 60} min sessions</span>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{mentor.experience}</Badge>
                {mentor.isActive && <Badge variant="outline">Available</Badge>}
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full"
                  onClick={() => setLocation(`/book-session/${mentor.id}`)}
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