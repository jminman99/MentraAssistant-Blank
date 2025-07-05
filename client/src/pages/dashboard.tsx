import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { HumanMentorCard } from "@/components/mentors/human-mentor-card";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("ai-mentors");
  const [, setLocation] = useLocation();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["/api/human-mentors"],
    queryFn: () => fetch("/api/human-mentors").then((res) => res.json()),
  });

  const humanMentors = Array.isArray(data?.data) ? data.data : [];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (
      tabParam &&
      [
        "council",
        "ai-mentors",
        "human-mentors",
        "sessions",
        "plan",
      ].includes(tabParam)
    ) {
      setSelectedTab(tabParam);
    }
    window.scrollTo(0, 0);
  }, []);

  if (!user) {
    setLocation("/login");
    return (
      <div className="p-8 text-center text-slate-600">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation and UI omitted here for brevity */}

      {/* Example usage of humanMentors */}
      {selectedTab === "human-mentors" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Experienced Guides
          </h2>

          {isLoading && (
            <div className="text-slate-600">Loading mentors...</div>
          )}

          {isError && (
            <div className="text-red-600">
              Error loading mentors: {error?.message}
            </div>
          )}

          {!isLoading && !isError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {humanMentors.map((mentor) => (
                <HumanMentorCard
                  key={mentor.id}
                  mentor={mentor}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}