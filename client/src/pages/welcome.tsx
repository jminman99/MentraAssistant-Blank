import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Users, MessageCircle, Calendar, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="mentra-logo">
              <div className="text-white font-bold text-sm">M</div>
            </div>
            <span className="text-2xl font-bold mentra-text-gradient">Mentra</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center space-y-8">
            {/* Main Tagline */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Sometimes you need{" "}
                <span className="mentra-text-gradient">one man who's lived it.</span>
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Sometimes you need{" "}
                <span className="mentra-text-gradient">a council who's seen it all.</span>
              </h1>
            </div>

            {/* Problem Framing */}
            <div className="max-w-3xl mx-auto space-y-6 text-lg text-slate-600">
              <p className="leading-relaxed">
                In a world where traditional mentorship has fragmented and authentic guidance feels 
                scarce, men are navigating life's complexities in isolation.
              </p>
              <p className="leading-relaxed font-medium text-slate-800">
                Mentra bridges ancient wisdom with modern accessibility, connecting you with both 
                AI-powered counsel and seasoned human guides who've walked the paths you're exploring.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                className="mentra-button px-8 py-4 text-lg"
                onClick={() => setLocation("/login")}
              >
                Enter Mentra
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                className="px-8 py-4 text-lg border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => setShowDetails(!showDetails)}
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        {showDetails && (
          <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Wisdom Delivered Two Ways
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Choose your path: immediate counsel from AI mentors trained on decades 
                  of experience, or scheduled sessions with accomplished human guides.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* AI Wisdom Guides */}
                <Card className="mentra-card p-8">
                  <CardContent className="space-y-6 p-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
                        <MessageCircle className="text-white h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Wisdom Guides</h3>
                        <p className="text-slate-600">AI-powered counsel, available anytime</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 text-slate-700">
                      <p>
                        Engage with AI mentors who embody the wisdom of accomplished leaders—
                        each with distinct personalities, expertise, and life experience.
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start space-x-2">
                          <Shield className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>Marcus: Fortune 500 business strategy</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Shield className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>David: Pastoral wisdom and life counsel</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Shield className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>Robert: Technology leadership</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Human Experienced Guides */}
                <Card className="mentra-card p-8">
                  <CardContent className="space-y-6 p-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                        <Users className="text-white h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Experienced Guides</h3>
                        <p className="text-slate-600">Real humans, real experience</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 text-slate-700">
                      <p>
                        Book one-on-one sessions with accomplished professionals who've 
                        navigated the challenges you're facing and emerged stronger.
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start space-x-2">
                          <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>Flexible scheduling around your life</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>Verified credentials and experience</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <span>Council sessions available for complex decisions</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mentor Wisdom Quotes */}
              <div className="grid md:grid-cols-3 gap-6 mt-16 mb-12">
                <Card className="bg-slate-50/50 border-slate-200 p-6">
                  <blockquote className="text-slate-700 italic mb-4">
                    "True leadership isn't about having all the answers—it's about knowing who to ask and when to listen."
                  </blockquote>
                  <div className="text-sm text-slate-600">
                    <strong>Marcus</strong> • Fortune 500 Strategy
                  </div>
                </Card>
                
                <Card className="bg-slate-50/50 border-slate-200 p-6">
                  <blockquote className="text-slate-700 italic mb-4">
                    "Every man needs a place where he can speak truth without judgment and receive wisdom without pretense."
                  </blockquote>
                  <div className="text-sm text-slate-600">
                    <strong>David</strong> • Pastoral Wisdom
                  </div>
                </Card>
                
                <Card className="bg-slate-50/50 border-slate-200 p-6">
                  <blockquote className="text-slate-700 italic mb-4">
                    "The best decisions come from combining analytical thinking with the wisdom of those who've faced similar crossroads."
                  </blockquote>
                  <div className="text-sm text-slate-600">
                    <strong>Robert</strong> • Technology Leadership
                  </div>
                </Card>
              </div>

              {/* Final CTA */}
              <div className="text-center pt-8">
                <p className="text-lg text-slate-600 mb-6">
                  Whether you need immediate guidance or deep, personal mentorship—Mentra meets you where you are.
                </p>
                <Button 
                  className="mentra-button px-10 py-4 text-lg"
                  onClick={() => setLocation("/login")}
                >
                  Begin Your Journey
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <div className="text-slate-900 font-bold text-sm">M</div>
              </div>
              <span className="text-2xl font-bold">Mentra</span>
            </div>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Connecting the timeless wisdom of experience with the accessibility of modern technology. 
              Every man deserves guidance from those who've walked the path before.
            </p>
            <div className="border-t border-slate-800 pt-6">
              <p className="text-slate-500 text-sm">
                © 2025 Mentra. Wisdom. Experience. Guidance.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}