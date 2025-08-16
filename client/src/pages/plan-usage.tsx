import React from 'react';
import { useAuth } from "@/lib/auth-hook";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, MessageSquare, Users, CheckCircle } from 'lucide-react';

export default function PlanUsagePage() {
  const { user } = useAuth();

  if (!user) return null;

  const planFeatures = {
    'ai-only': {
      name: 'AI Only',
      aiMentors: 'Unlimited',
      individualSessions: 0,
      councilSessions: 0,
      features: ['AI Mentor Conversations', 'Basic Support']
    },
    'individual': {
      name: 'Individual',
      aiMentors: 'Unlimited',
      individualSessions: 4,
      councilSessions: 0,
      features: ['AI Mentor Conversations', 'Individual Human Mentors', 'Priority Support']
    },
    'council': {
      name: 'Council',
      aiMentors: 'Unlimited',
      individualSessions: 4,
      councilSessions: 2,
      features: ['AI Mentor Conversations', 'Individual Human Mentors', 'Council Sessions', 'Premium Support']
    },
    'unlimited': {
      name: 'Unlimited',
      aiMentors: 'Unlimited',
      individualSessions: 'Unlimited',
      councilSessions: 'Unlimited',
      features: ['All Features', 'Unlimited Sessions', 'White-glove Support']
    }
  };

  const currentPlan = planFeatures[user.subscriptionPlan || 'ai-only'];
  const individualUsed = user.individualSessionsUsed || 0;
  const councilUsed = user.councilSessionsUsed || 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Plan & Usage</h1>

      <div className="grid gap-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Current Plan: {currentPlan.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Features</h3>
                <ul className="space-y-1">
                  {currentPlan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Inclusions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Mentors: {currentPlan.aiMentors}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Individual Sessions: {currentPlan.individualSessions}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Council Sessions: {currentPlan.councilSessions}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Individual Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Individual Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof currentPlan.individualSessions === 'number' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Used this month</span>
                    <span>{individualUsed} / {currentPlan.individualSessions}</span>
                  </div>
                  <Progress 
                    value={(individualUsed / currentPlan.individualSessions) * 100}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-600">
                    {currentPlan.individualSessions - individualUsed} sessions remaining
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Badge variant="secondary">Unlimited</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Council Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Council Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof currentPlan.councilSessions === 'number' ? (
                currentPlan.councilSessions > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used this month</span>
                      <span>{councilUsed} / {currentPlan.councilSessions}</span>
                    </div>
                    <Progress 
                      value={(councilUsed / currentPlan.councilSessions) * 100}
                      className="h-2"
                    />
                    <div className="text-xs text-gray-600">
                      {currentPlan.councilSessions - councilUsed} sessions remaining
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Badge variant="outline">Not included</Badge>
                  </div>
                )
              ) : (
                <div className="text-center py-4">
                  <Badge variant="secondary">Unlimited</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Mentors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Mentors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Badge variant="secondary">Unlimited Access</Badge>
              <p className="text-sm text-gray-600 mt-2">
                Chat with all AI mentors without limits
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}