import React from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();

  console.log("✅ APP LOADED");
  console.log("✅ User object from useAuth:", user);

  const {
    data: mentorsData,
    isLoading: mentorsLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/human-mentors"],
    queryFn: () =>
      fetch("/api/human-mentors", {
        credentials: "include",
      }).then((res) => res.json()),
    enabled: !!user,
  });

  if (isLoading) return <div>Loading user...</div>;

  if (!user) return <div>No user found. Redirecting...</div>;

  if (mentorsLoading) return <div>Loading mentors...</div>;

  if (isError) {
    console.error("❌ Error fetching mentors:", error);
    return <div>Error fetching mentors: {error.message}</div>;
  }

  const mentors = Array.isArray(mentorsData?.data)
    ? mentorsData.data
    : [];

  console.log("✅ Mentors data:", mentors);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>✅ Dashboard Loaded!</h1>
      <p>Welcome, {user.firstName} {user.lastName}</p>

      <h2>Human Mentors:</h2>
      {mentors.length === 0 && <p>No mentors found.</p>}
      {mentors.map((m) => (
        <div key={m.id} style={{ marginBottom: "1rem" }}>
          <strong>{m.user?.firstName} {m.user?.lastName}</strong>
          <p>{m.expertise || "No expertise listed"}</p>
          <p>{m.bio || "No bio available"}</p>
        </div>
      ))}
    </div>
  );
}