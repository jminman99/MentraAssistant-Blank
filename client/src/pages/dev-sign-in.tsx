import React from 'react';
import { useLocation } from 'wouter';

export default function DevSignInPage() {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    // For development mode, just redirect to dashboard
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg border border-slate-300">
                <div className="text-white font-bold text-xl">M</div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Mentra</h1>
          </div>
          <p className="text-slate-600">Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Development Mode</h2>
            <p className="text-sm text-slate-600 mt-2">
              Clerk authentication is not configured. Set up your Clerk keys to enable full authentication.
            </p>
          </div>
          
          <button
            onClick={handleSignIn}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Continue to Dashboard
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              To enable Clerk authentication, add your VITE_CLERK_PUBLISHABLE_KEY to the environment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}