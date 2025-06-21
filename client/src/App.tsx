import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Welcome from "@/pages/welcome";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import MentorApplication from "@/pages/mentor-application";
import AdminDashboard from "@/pages/admin-dashboard";
import CouncilScheduling from "@/pages/council-scheduling-new";
import IndividualBooking from "@/pages/individual-booking";
import Sessions from "@/pages/sessions";
import MentorAvailability from "@/pages/MentorAvailability";
import SessionDetails from "@/pages/SessionDetails";
import Mentors from "@/pages/mentors";
import { useAuth } from "@/lib/auth";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const AdminRoute = () => {
    if (!user) return <Login />;
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return <NotFound />;
    }
    return <AdminDashboard />;
  };

  const CouncilRoute = () => {
    if (!user) return <Login />;
    if (user.subscriptionPlan !== 'council') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
              <div className="text-6xl mb-4">🏛️</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">Council Access Required</h1>
              <p className="text-slate-600 mb-6">
                Council sessions are only available with a Council subscription plan.
              </p>
              <div className="space-y-3">
                <Link href="/dashboard">
                  <Button className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
                <p className="text-sm text-slate-500">
                  Upgrade to Council plan to access group mentoring sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <CouncilScheduling />;
  };

  const IndividualBookingRoute = () => {
    if (!user) return <Login />;
    if (!['individual', 'council'].includes(user.subscriptionPlan)) {
      return <NotFound />;
    }
    return <IndividualBooking />;
  };

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Welcome} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={user ? Dashboard : Login} />
      <Route path="/individual-booking" component={IndividualBookingRoute} />
      <Route path="/sessions" component={user ? Sessions : Login} />
      <Route path="/council" component={CouncilRoute} />
      <Route path="/council-scheduling" component={CouncilRoute} />
      <Route path="/mentor-application" component={MentorApplication} />
      <Route path="/admin" component={AdminRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
