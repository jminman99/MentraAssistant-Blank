import React from "react";
import { Switch, Route, useLocation } from "wouter";
import Dashboard from "./pages/dashboard";
import TestPage from "./pages/test";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import DevSignInPage from "./pages/dev-sign-in";
import PlanUsagePage from "./pages/plan-usage";
import SessionsPage from "./pages/sessions";
import { useAuth } from "./lib/auth-hook";
import ErrorBoundary from "./components/ErrorBoundary";

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  React.useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

function PrivateRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/sign-in");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? <Component /> : null;
}

function Router() {
  const { user, isLoading } = useAuth();

  const clerkPublishableKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY;
  const SignInComponent = clerkPublishableKey ? SignInPage : DevSignInPage;

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/test" component={TestPage} />
      <Route path="/sign-in" component={SignInComponent} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/login" component={() => <Redirect to="/sign-in" />} />
      <Route path="/dashboard" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/plan-usage" component={() => <PrivateRoute component={PlanUsagePage} />} />
      <Route path="/sessions" component={() => <PrivateRoute component={SessionsPage} />} />
      <Route path="/">
        {() => (user ? <Dashboard /> : <Redirect to="/sign-in" />)}
      </Route>
      <Route path="*">
        <div className="min-h-screen flex items-center justify-center text-slate-600 text-lg">
          404 - Page not found
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}

export default App;