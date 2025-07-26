import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, Users, Check, Star } from "lucide-react";
import { format } from "date-fns";
import CouncilBookingDialog from "@/components/council/CouncilBookingDialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonMentorGrid, SessionCardSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { fetchWithClerkToken, processApiResponse, extractApiData, sortMentorsByRating } from "@/lib/api-utils";

interface HumanMentor {
  id: number;
  user: {
    firstName: string;
    lastName: string;
  };
  expertise: string;
  bio: string;
  rating: string | null;
  hourlyRate: string;
}

function CouncilSessionsList() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const { data: sessionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/council-bookings'],
    enabled: isLoaded && isSignedIn,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetchWithClerkToken(getToken, '/api/council-bookings');
      return processApiResponse(response);
    },
  });

  const sessions = extractApiData(sessionsData);

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Your Council Sessions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Your Council Sessions
        </h2>
        <ErrorFallback
          title="Failed to load sessions"
          description="We couldn't load your council sessions."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Your Council Sessions ({sessions.length})
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">No council sessions scheduled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((booking: any) => (
            <Card key={booking.sessionId || booking.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Council Session</CardTitle>
                  <StatusBadge status={booking.status === 'pending' ? 'pending' : booking.status}>
                    {booking.status === 'pending' ? 'Coordinating' : booking.status}
                  </StatusBadge>
                </div>
                <CardDescription>
                  {booking.status === 'pending' ? 'We\'re coordinating with your selected mentors' : `Session ${booking.status}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {booking.scheduledDate ? format(new Date(booking.scheduledDate), 'PPP') : 'Date TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {booking.scheduledDate ? format(new Date(booking.scheduledDate), 'p') : 'Time TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">{booking.mentorCount || 3} mentors</span>
                  </div>
                  {booking.sessionGoals && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Session Goals:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{booking.sessionGoals}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}



export default function CouncilScheduling() {
  const [, navigate] = useLocation();

  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [selectedMentors, setSelectedMentors] = useState<number[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  // Fetch available mentors for council sessions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/human-mentors'],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      const response = await fetchWithClerkToken(getToken, '/api/human-mentors');
      return processApiResponse(response);
    },
  });

  const rawMentors = extractApiData(data);
  const mentors = useMemo(() => sortMentorsByRating(rawMentors), [rawMentors]);

  // Redirect to login if not authenticated
  if (isLoaded && !isSignedIn) {
    navigate('/sign-in');
    return null;
  }

  // Don't render if user data isn't available
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  

  const toggleMentorSelection = (mentorId: number) => {
    setSelectedMentors(prev => {
      const newSelection = prev.includes(mentorId)
        ? prev.filter(id => id !== mentorId)
        : [...prev, mentorId];
      return newSelection;
    });
  };

  const canAddMoreMentors = selectedMentors.length < 5;
  const hasMinimumMentors = selectedMentors.length >= 3;

  const handleBookingSuccess = () => {
    setSelectedMentors([]);
    navigate('/sessions');
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Council Sessions
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
              Loading your mentors...
            </p>
          </div>
          <SkeletonMentorGrid count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Council Sessions
            </h1>
          </div>
          <ErrorFallback
            title="Failed to load mentors"
            description="We couldn't load the available mentors."
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl pb-32 lg:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Council Sessions
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Build your council of 3-5 mentors for <strong>ONE single one-hour session</strong> where all mentors participate together
          </p>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              "Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all."
            </h2>
            <p className="text-slate-300 mb-3">
              Select your panel of mentors and we'll coordinate a single session where all your chosen guides come together to provide comprehensive wisdom for your specific challenge.
            </p>
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-3">
              <p className="text-slate-100 font-medium">
                Council Plan: One monthly council session included for $49
              </p>
            </div>
          </div>
        </div>

        {/* Mentor Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Select Your Council ({selectedMentors.length}/5)
            </h2>
            <div className="flex items-center gap-4">
              <Badge variant={hasMinimumMentors ? "default" : "secondary"}>
                {hasMinimumMentors ? "Ready to Book" : `Need ${3 - selectedMentors.length} more`}
              </Badge>
              <Button 
                onClick={() => setShowBookingDialog(true)}
                disabled={!hasMinimumMentors}
                className="bg-slate-800 hover:bg-slate-700"
              >
                Book Council Session
              </Button>
            </div>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors?.map((mentor: HumanMentor) => (
              <Card 
                key={mentor.id} 
                className={`cursor-pointer transition-all duration-200 ${
                  selectedMentors.includes(mentor.id)
                    ? 'ring-2 ring-slate-800 bg-slate-50 dark:bg-slate-800'
                    : 'hover:shadow-md'
                } ${
                  !canAddMoreMentors && !selectedMentors.includes(mentor.id)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() => {
                  if (canAddMoreMentors || selectedMentors.includes(mentor.id)) {
                    toggleMentorSelection(mentor.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${selectedMentors.includes(mentor.id) ? 'Remove' : 'Add'} ${mentor.user.firstName} ${mentor.user.lastName} ${selectedMentors.includes(mentor.id) ? 'from' : 'to'} council`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (canAddMoreMentors || selectedMentors.includes(mentor.id)) {
                      toggleMentorSelection(mentor.id);
                    }
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {mentor.user.firstName} {mentor.user.lastName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedMentors.includes(mentor.id) && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                      {mentor.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm">{mentor.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {mentor.expertise}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-3">
                    {mentor.bio}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-slate-500">
                        Council Member
                      </span>
                      {mentor.hourlyRate && (
                        <span className="text-xs text-slate-400">
                          ${mentor.hourlyRate}/hour
                        </span>
                      )}
                    </div>
                    <Checkbox 
                      checked={selectedMentors.includes(mentor.id)}
                      className="pointer-events-none"
                      aria-label={`${mentor.user.firstName} ${mentor.user.lastName} selected`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {mentors && mentors.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No mentors available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Check back later for available mentors.
              </p>
            </div>
          )}
        </div>

        {/* Display existing council sessions */}
        <CouncilSessionsList />

        {/* Booking Dialog */}
        <CouncilBookingDialog
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          selectedMentors={selectedMentors}
          mentors={mentors}
          onBookingSuccess={handleBookingSuccess}
        />
      </div>
    </div>
  );
}