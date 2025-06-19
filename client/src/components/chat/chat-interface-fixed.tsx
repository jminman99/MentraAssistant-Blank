import { useAuth } from "@/lib/auth";

export function ChatInterface() {
  const { user } = useAuth();

  // Temporarily disabled to fix infinite loop issue
  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Mentors</h2>
        <p className="text-slate-600">Please log in to chat with mentors.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Mentors</h2>
      <p className="text-slate-600">Chat functionality is temporarily unavailable while we fix a technical issue.</p>
      <p className="text-slate-500 text-sm mt-2">Please try again in a few minutes.</p>
    </div>
  );
}