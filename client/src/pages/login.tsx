import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to Clerk authentication
    setLocation('/sign-in');
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">Redirecting to sign in...</h2>
        <p className="mt-2 text-sm text-gray-600">Please wait while we redirect you to the authentication page.</p>
      </div>
    </div>
  );
}