import React from 'react';
import { Calendar } from "lucide-react";

export function SimpleSessions() {
  console.log("🔍 SimpleSessions component rendering");
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <div className="text-slate-500 font-medium">Sessions</div>
        <div className="text-sm text-slate-400 mt-1">
          Your mentoring sessions will appear here
        </div>
      </div>
    </div>
  );
}