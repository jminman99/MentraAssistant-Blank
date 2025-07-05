import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Compass, MessageCircle, Sparkles, Heart, Star, Crown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ChatInterfaceVercel } from "@/components/chat/chat-interface-vercel";
import { HumanMentorCard } from "@/components/mentors/human-mentor-card";
import { UsageCard } from "@/components/subscription/usage-card";
import { UpcomingSessions } from "@/components/sessions/upcoming-sessions";
import { WelcomeModal } from "@/components/subscription/upgrade-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HumanMentor } from "@/types";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState("ai-mentors");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [, setLocation] = useLocation();

  // ✅ ADDED: safe logout handler
  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ✅ ADDED: safely fetch mentors
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["/api/human-mentors"],
    queryFn: () => fetch("/api/human-mentors").then((res) => res.json()),
  });

  const humanMentors = Array.isArray(data?.data) ? data.data : [];

  // Handle URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && ["council", "ai-mentors", "human-mentors", "sessions", "plan"].includes(tabParam)) {
      setSelectedTab(tabParam);
    }
    window.scrollTo(0, 0);
  }, []);

  // ✅ ADDED: guard if no user
  if (!user) {
    setLocation("/login");
    return (
      <div className="p-8 text-center text-slate-600">
        Redirecting to login...
      </div>
    );
  }

  console.log("✅ USER IN DASHBOARD:", user);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-2 mr-8">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-slate-300">
                <div className="text-white font-bold text-sm">M</div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Mentra
              </span>
            </div>

            <div className="flex items-center space-x-2 md:space-x-6 overflow-x-auto flex-1 scrollbar-hide">
              <button
                onClick={() => setSelectedTab("ai-mentors")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "ai-mentors" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                Wise Guides
              </button>
              <button
                onClick={() => setSelectedTab("human-mentors")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "human-mentors" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                Experienced Guides
              </button>
              <button
                onClick={() => setSelectedTab("council")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm flex items-center space-x-1 ${
                  selectedTab === "council" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                <Crown className="w-3 h-3" />
                <span>Council</span>
              </button>
              <button
                onClick={() => setSelectedTab("sessions")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "sessions" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                My Sessions
              </button>
              <button
                onClick={() => setSelectedTab("plan")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "plan" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                Plan & Usage
              </button>
              {(user.role === "admin" || user.role === "super_admin") && (
                <Link href="/admin">
                  <button className="whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm flex items-center space-x-1">
                    <Crown className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                </Link>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-600">Active</span>
              </div>

              <div className="relative group">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <img
                    src={
                      user.profileImage ||
                      `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`
                    }
                    alt="User Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:block text-sm font-medium text-slate-700">
                    {user.firstName} {user.lastName?.charAt(0)}.
                  </span>
                </div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-4 border-b border-slate-200">
                    <div className="text-sm font-medium text-slate-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-slate-600">{user.email}</div>
                  </div>
                  <div className="p-2">
                    {(user.role === "admin" || user.role === "super_admin") && (
                      <Link href="/admin">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 mb-1">
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-slate-600"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {selectedTab === "ai-mentors" && <ChatInterfaceVercel />}

            {selectedTab === "human-mentors" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Experienced Guides</h2>
                {isLoading && <p className="text-slate-500">Loading mentors...</p>}
                {isError && <p className="text-red-500">Failed to load mentors: {error?.message}</p>}
                {!isLoading && !isError && (
                  <div>
                    {humanMentors.length === 0 ? (
                      <p className="text-slate-500">No experienced guides available.</p>
                    ) : (
                      <p className="text-slate-500">Mentors loaded successfully!</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedTab === "sessions" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">My Sessions</h2>
                <UpcomingSessions />
              </div>
            )}

            {selectedTab === "plan" && (
              <div className="space-y-6">
                <UsageCard user={user} />
              </div>
            )}

            {selectedTab === "council" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <p>Council scheduling goes here…</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUpgradeModal && (
        <WelcomeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}