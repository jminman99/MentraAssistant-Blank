import React from "react";
import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import LoginSimple from "@/pages/login-simple";
import { useAuth } from "@/lib/auth";

function Router() {
  const { user, isLoading } = useAuth();

  console.log('Router state:', { user, isLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginSimple} />
      <Route path="/">
        {user ? (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Welcome to Mentra</h1>
            <p>Logged in as: {user.email}</p>
            <p>User ID: {user.id}</p>
            <p>Name: {user.name}</p>
            <button 
              onClick={async () => {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                if (response.ok) {
                  window.location.reload();
                }
              }}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            >
              Logout
            </button>
          </div>
        ) : (
          <LoginSimple />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
