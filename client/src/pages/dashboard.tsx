import React from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { user, isLoading } = useAuth();

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
    return <div>Error fetching mentors: {error.message}</div>;
  }

  const mentors = Array.isArray(mentorsData?.data)
    ? mentorsData.data
    : [];

  return (
    <div>
      <h2>Welcome, {user.firstName} {user.lastName}</h2>
      <h3>Human Mentors:</h3>
      {mentors.length === 0 ? (
        <p>No mentors found.</p>
      ) : (
        mentors.map((mentor) => (
          <div key={mentor.id} className="mentor-card">
            <h4>{mentor.user.firstName} {mentor.user.lastName}</h4>
            <p>{mentor.expertiseAreas?.join(", ") || "No expertise listed"}</p>
            <p>{mentor.bio || "No bio available"}</p>
          </div>
        ))
      )}
    </div>
  );
}