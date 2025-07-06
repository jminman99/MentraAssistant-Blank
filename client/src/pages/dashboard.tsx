import React from "react";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();

  console.log("✅ APP LOADED");
  console.log("✅ User object from useAuth:", user);
  console.log("✅ isLoading:", isLoading);
  console.log("✅ isAuthenticated:", isAuthenticated);

  if (isLoading) {
    return <div>Loading user...</div>;
  }

  if (!user) {
    console.log("❌ No user found. Possibly unauthenticated.");
    return <div>No user found. Redirecting to login...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>✅ Dashboard Loaded!</h1>
      <p>Welcome, {user.firstName || "Unknown"} {user.lastName || ""}</p>
      <pre style={{
        background: "#f0f0f0",
        padding: "1rem",
        borderRadius: "6px",
        overflow: "auto"
      }}>
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}