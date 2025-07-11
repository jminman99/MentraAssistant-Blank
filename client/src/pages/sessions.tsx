import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Users } from "lucide-react";
import { SessionsContent } from "@/components/sessions/sessions-content";

export default function Sessions() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Helper function to navigate to booking page
  const handleBookNewSession = () => {
    if (user?.subscriptionPlan === 'council') {
      setLocation('/dashboard?tab=council');
    } else {
      setLocation('/individual-booking');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-32 lg:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-900">Sessions</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Sessions</h1>
              <p className="text-slate-600 mt-2">
                {user?.subscriptionPlan === 'council' 
                  ? 'Manage your council sessions with multiple mentors' 
                  : 'Manage your individual mentor sessions'
                }
              </p>
            </div>
            <Button onClick={handleBookNewSession}>
              {user?.subscriptionPlan === 'council' ? (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Book Council Session
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Book Individual Session
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sessions Content */}
        <SessionsContent />
      </div>
    </div>
  );
}