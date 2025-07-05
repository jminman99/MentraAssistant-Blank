import React from 'react';
import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
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

        <div className="flex justify-center">
          <SignUp 
            afterSignUpUrl="/"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-slate-800 hover:bg-slate-900',
                card: 'shadow-lg border border-slate-200',
                headerTitle: 'text-slate-800',
                headerSubtitle: 'text-slate-600',
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}