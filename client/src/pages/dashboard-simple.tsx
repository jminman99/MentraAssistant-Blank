import React from 'react';
import { useAuth } from '@clerk/clerk-react';

export default function DashboardSimple() {
  const { isLoaded, isSignedIn, user } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Not authenticated</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Welcome to Mentra</h1>
          <p className="text-slate-600 mb-4">
            Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all.
          </p>
          {user && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-2">User Info:</h3>
              <p className="text-sm text-slate-600">
                Email: {user.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-sm text-slate-600">
                Name: {user.firstName} {user.lastName}
              </p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">AI Mentors</h2>
            <p className="text-slate-600 mb-4">Get instant guidance from AI-powered mentors.</p>
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              Mentor loading functionality needs API fixes
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Human Mentors</h2>
            <p className="text-slate-600 mb-4">Book sessions with experienced human mentors.</p>
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              Mentor loading functionality needs API fixes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}