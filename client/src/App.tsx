import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Welcome from "@/pages/welcome";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import MentorApplication from "@/pages/mentor-application";
import AdminDashboard from "@/pages/admin-dashboard";
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

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Welcome} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={user ? Dashboard : Login} />
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
