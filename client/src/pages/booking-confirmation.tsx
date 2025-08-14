
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, ArrowLeft } from 'lucide-react';

export function BookingConfirmation() {
  const navigate = useNavigate();
  const [sessionGoals, setSessionGoals] = useState<string>('');
  const [mentorId, setMentorId] = useState<string>('');

  useEffect(() => {
    // Retrieve stored session data
    const goals = localStorage.getItem('pendingSessionGoals');
    const mentor = localStorage.getItem('pendingMentorId');
    
    if (goals) {
      setSessionGoals(goals);
      localStorage.removeItem('pendingSessionGoals');
    }
    if (mentor) {
      setMentorId(mentor);
      localStorage.removeItem('pendingMentorId');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-800">Booking Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>Your session booking has been submitted successfully.</p>
          </div>
          
          {sessionGoals && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">Session Goals:</p>
              <p className="text-sm text-blue-700">{sessionGoals}</p>
            </div>
          )}
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Your appointment will appear in "My Sessions" within a few minutes.</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/sessions')} 
              className="w-full"
            >
              View My Sessions
            </Button>
            <Button 
              onClick={() => navigate('/mentors')} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Mentors
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
