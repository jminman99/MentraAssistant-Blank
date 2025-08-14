import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import Dashboard from "./pages/dashboard";
import TestPage from "./pages/test";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import DevSignInPage from "./pages/dev-sign-in";
import PlanUsagePage from "./pages/plan-usage";
import SessionsPage from "./pages/sessions";
import IndividualBooking from "./pages/individual-booking";
import CouncilScheduling from "./pages/council-scheduling";
import Debug from "./pages/debug";
import ErrorBoundary from "./components/ErrorBoundary";
import { SessionDetails } from './pages/SessionDetails';
import { BookingConfirmation } from './pages/booking-confirmation';
import { NotFound } from './pages/not-found';

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  React.useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

function PrivateRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return isSignedIn ? <Component /> : null;
}

function Router() {
  const { isLoaded, isSignedIn } = useAuth();

  console.log('App Router - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/test" component={TestPage} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/login" component={() => <Redirect to="/sign-in" />} />
      <Route path="/dashboard" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/plan-usage" component={() => <PrivateRoute component={PlanUsagePage} />} />
      <Route path="/sessions" component={() => <PrivateRoute component={SessionsPage} />} />
      <Route path="/individual-booking" component={() => <PrivateRoute component={IndividualBooking} />} />
      <Route path="/council-scheduling" component={() => <PrivateRoute component={CouncilScheduling} />} />
      <Route path="/debug" component={() => <PrivateRoute component={Debug} />} />
      <Route path="/session/:id" element={<SessionDetails />} />
      <Route path="/booking-confirmation" element={<BookingConfirmation />} />
      <Route path="/">
        {() => (isSignedIn ? <Dashboard /> : <Redirect to="/sign-in" />)}
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