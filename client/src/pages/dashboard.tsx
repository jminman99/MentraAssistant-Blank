import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Compass, MessageCircle, Sparkles, Heart, Star, Crown, Settings } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { ChatInterface } from "@/components/chat/chat-interface-fixed";
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

  // Scroll to top when dashboard loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-2 mr-8">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-slate-300">
                <div className="text-white font-bold text-sm">M</div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Mentra</span>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-6 overflow-x-auto flex-1 scrollbar-hide">
              <button 
                onClick={() => setSelectedTab("ai-mentors")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "ai-mentors" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                Wisdom Guides
              </button>
              {user.subscriptionPlan === 'council' && (
                <button 
                  onClick={() => setSelectedTab("council")}
                  className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm flex items-center space-x-1 ${
                    selectedTab === "council" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                  }`}
                >
                  <Crown className="w-3 h-3" />
                  <span>Council</span>
                </button>
              )}
              {user.subscriptionPlan !== 'council' && (
                <button 
                  onClick={() => setSelectedTab("human-mentors")}
                  className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                    selectedTab === "human-mentors" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                  }`}
                >
                  Experienced Guides
                </button>
              )}
              <button 
                onClick={() => setSelectedTab("sessions")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "sessions" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                Journey Sessions
              </button>
              <button 
                onClick={() => setSelectedTab("plan")}
                className={`whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm ${
                  selectedTab === "plan" ? "border-b-2 border-primary pb-1 text-primary font-medium" : ""
                }`}
              >
                Plan & Usage
              </button>
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Link href="/admin">
                  <button className="whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm flex items-center space-x-1">
                    <Crown className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                </Link>
              )}
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
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <Link href="/admin">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-slate-600 mb-1"
                        >
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {selectedTab === "ai-mentors" && <ChatInterface />}
            
            {selectedTab === "human-mentors" && user.subscriptionPlan !== 'council' && (
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

            {selectedTab === "plan" && (
              <div className="space-y-6">
                <UsageCard user={user} onUpgrade={() => setShowUpgradeModal(true)} />
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Sessions</h3>
                  <UpcomingSessions compact />
                </div>
              </div>
            )}

            {selectedTab === "council" && user.subscriptionPlan === 'council' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-center py-12">
                  <Crown className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Council Sessions</h2>
                  <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                    Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all.
                    Your council plan includes one monthly council session with 3-5 mentors for $50.
                  </p>
                  <Link href="/council">
                    <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white">
                      Schedule Council Session
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - show quick access on larger screens */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Quick Access</h3>
              </div>
              
              <div className="space-y-3">
                <Button 
                  variant={selectedTab === "ai-mentors" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab("ai-mentors")}
                  className="w-full justify-start"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Wisdom Guides
                </Button>
                {user.subscriptionPlan === 'council' && (
                  <Button 
                    variant={selectedTab === "council" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTab("council")}
                    className="w-full justify-start"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Council Sessions
                  </Button>
                )}
                {user.subscriptionPlan !== 'council' && (
                  <Button 
                    variant={selectedTab === "human-mentors" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTab("human-mentors")}
                    className="w-full justify-start"
                  >
                    <Compass className="h-4 w-4 mr-2" />
                    Human Mentors
                  </Button>
                )}
                <Button 
                  variant={selectedTab === "sessions" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab("sessions")}
                  className="w-full justify-start"
                >
                  <Star className="h-4 w-4 mr-2" />
                  My Sessions
                </Button>
                <Button 
                  variant={selectedTab === "plan" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab("plan")}
                  className="w-full justify-start"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Plan & Usage
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => setSelectedTab("ai-mentors")}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
              selectedTab === "ai-mentors" ? "text-primary bg-blue-50" : "text-slate-600"
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium">Wisdom</span>
          </button>
          <button
            onClick={() => setSelectedTab("human-mentors")}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
              selectedTab === "human-mentors" ? "text-primary bg-blue-50" : "text-slate-600"
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-xs font-medium">Mentors</span>
          </button>
          <button
            onClick={() => setSelectedTab("sessions")}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
              selectedTab === "sessions" ? "text-primary bg-blue-50" : "text-slate-600"
            }`}
          >
            <Star className="h-5 w-5" />
            <span className="text-xs font-medium">Sessions</span>
          </button>
          <button
            onClick={() => setSelectedTab("plan")}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
              selectedTab === "plan" ? "text-primary bg-blue-50" : "text-slate-600"
            }`}
          >
            <Crown className="h-5 w-5" />
            <span className="text-xs font-medium">Plan</span>
          </button>
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
