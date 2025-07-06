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
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">
        Welcome, {user.firstName} {user.lastName}
      </h1>

      <h2 className="text-xl font-semibold mt-8 mb-2">
        Human Mentors:
      </h2>

      {mentors.length === 0 && (
        <p className="text-gray-500">No mentors found.</p>
      )}

      {mentors.map((mentor) => (
        <div
          key={mentor.id}
          className="border border-gray-300 rounded p-4 mb-4 shadow-sm"
        >
          <h3 className="text-lg font-bold">
            {mentor.user.firstName} {mentor.user.lastName}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {mentor.expertiseAreas?.join(", ") || "No expertise listed"}
          </p>
          <p className="mt-2 text-gray-800">
            {mentor.bio || "No bio available"}
          </p>
        </div>
      ))}
    </div>
  );
}