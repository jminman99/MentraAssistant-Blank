import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ChatInterface } from "@/components/chat/chat-interface";
import { HumanMentorCard } from "@/components/mentors/human-mentor-card";
import { UsageCard } from "@/components/subscription/usage-card";
import { UpcomingSessions } from "@/components/sessions/upcoming-sessions";
import { BookingModal } from "@/components/booking/booking-modal";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { useQuery } from "@tanstack/react-query";
import { HumanMentor } from "@/types";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState("ai-mentors");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<HumanMentor | null>(null);

  const { data: humanMentors = [] } = useQuery<HumanMentor[]>({
    queryKey: ['/api/human-mentors'],
  });

  const handleBookSession = (mentor: HumanMentor) => {
    setSelectedMentor(mentor);
    setShowBookingModal(true);
  };

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Users className="text-white h-5 w-5" />
                </div>
                <span className="text-xl font-bold text-slate-900">Mentra</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => setSelectedTab("ai-mentors")}
                className={`text-slate-600 hover:text-primary transition-colors ${
                  selectedTab === "ai-mentors" ? "border-b-2 border-primary pb-1" : ""
                }`}
              >
                AI Mentors
              </button>
              <button 
                onClick={() => setSelectedTab("human-mentors")}
                className={`text-slate-600 hover:text-primary transition-colors ${
                  selectedTab === "human-mentors" ? "border-b-2 border-primary pb-1" : ""
                }`}
              >
                Human Mentors
              </button>
              <button 
                onClick={() => setSelectedTab("sessions")}
                className={`text-slate-600 hover:text-primary transition-colors ${
                  selectedTab === "sessions" ? "border-b-2 border-primary pb-1" : ""
                }`}
              >
                My Sessions
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Subscription Status */}
              <div className="hidden sm:flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-600 capitalize">{user.subscriptionPlan} Plan</span>
              </div>
              
              {/* User Profile */}
              <div className="relative group">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src={user.profileImage || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
                    alt="User Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:block text-sm font-medium text-slate-700">
                    {user.firstName} {user.lastName.charAt(0)}.
                  </span>
                </div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-4 border-b border-slate-200">
                    <div className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-slate-600">{user.email}</div>
                  </div>
                  <div className="p-2">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {selectedTab === "ai-mentors" && <ChatInterface />}
            
            {selectedTab === "human-mentors" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Human Mentors</h2>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <MessageCircle className="h-4 w-4" />
                    <span>{user.sessionsUsed}/{user.sessionsLimit} sessions used</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {humanMentors.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-slate-500">No human mentors available</div>
                      <div className="text-sm text-slate-400 mt-1">Check back later for new mentors</div>
                    </div>
                  ) : (
                    humanMentors.map((mentor) => (
                      <HumanMentorCard
                        key={mentor.id}
                        mentor={mentor}
                        onBook={() => handleBookSession(mentor)}
                        disabled={user.sessionsUsed >= user.sessionsLimit}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
            
            {selectedTab === "sessions" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">My Sessions</h2>
                <UpcomingSessions />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Human Mentors Quick Access */}
            {selectedTab === "ai-mentors" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Human Mentors</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedTab("human-mentors")}
                    className="text-primary hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {humanMentors.slice(0, 2).map((mentor) => (
                    <HumanMentorCard
                      key={mentor.id}
                      mentor={mentor}
                      onBook={() => handleBookSession(mentor)}
                      disabled={user.sessionsUsed >= user.sessionsLimit}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Subscription Usage */}
            <UsageCard user={user} onUpgrade={() => setShowUpgradeModal(true)} />

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Sessions</h3>
              <UpcomingSessions compact />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBookingModal && selectedMentor && (
        <BookingModal
          mentor={selectedMentor}
          user={user}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedMentor(null);
          }}
        />
      )}

      {showUpgradeModal && (
        <UpgradeModal
          currentPlan={user.subscriptionPlan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
