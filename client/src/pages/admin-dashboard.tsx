import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  FileText,
  Quote,
  Lightbulb,
  MessageSquare 
} from "lucide-react";

interface MentorApplication {
  id: number;
  applicantName: string;
  email: string;
  phone?: string;
  age?: number;
  bio: string;
  expertise: string;
  yearsExperience?: number;
  
  // Semantic data
  lifeStories: any[];
  challenges: any[];
  quotes: any[];
  principles: any[];
  
  // Topic wisdom
  careerWisdom?: string;
  relationshipAdvice?: string;
  parentingInsights?: string;
  addictionRecovery?: string;
  spiritualGuidance?: string;
  financialWisdom?: string;
  mentalHealthSupport?: string;
  purposeAndBelonging?: string;
  
  status: 'pending' | 'interview_scheduled' | 'approved' | 'rejected';
  adminNotes?: string;
  interviewDate?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<MentorApplication | null>(null);
  const [reviewData, setReviewData] = useState({
    status: '',
    adminNotes: '',
    interviewDate: ''
  });

  const { data: applications, isLoading } = useQuery<MentorApplication[]>({
    queryKey: ['/api/admin/mentor-applications'],
    retry: false
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/admin/mentor-applications/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/mentor-applications'] });
      setSelectedApplication(null);
      toast({
        title: "Application Updated",
        description: "The mentor application has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update the application. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleReview = (application: MentorApplication) => {
    setSelectedApplication(application);
    setReviewData({
      status: application.status,
      adminNotes: application.adminNotes || '',
      interviewDate: application.interviewDate || ''
    });
  };

  const handleSubmitReview = () => {
    if (!selectedApplication) return;
    
    updateApplicationMutation.mutate({
      id: selectedApplication.id,
      updates: reviewData
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'interview_scheduled':
        return <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />Interview Scheduled</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">Loading applications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-slate-600">
            Review and approve mentor applications with semantic content for AI training
          </p>
        </div>

        <div className="grid gap-6">
          {(applications as MentorApplication[])?.length > 0 ? (applications as MentorApplication[]).map((application: MentorApplication) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {application.applicantName}
                    </CardTitle>
                    <CardDescription>
                      {application.expertise} • {application.email}
                    </CardDescription>
                  </div>
                  {getStatusBadge(application.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {application.lifeStories?.length || 0} stories
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {application.challenges?.length || 0} challenges
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {application.quotes?.length || 0} quotes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {application.principles?.length || 0} principles
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-slate-700 mb-4 line-clamp-2">
                  {application.bio}
                </p>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleReview(application)}
                  >
                    Review Application
                  </Button>
                  {application.status === 'pending' && (
                    <>
                      <Button 
                        size="sm"
                        onClick={() => {
                          updateApplicationMutation.mutate({
                            id: application.id,
                            updates: { status: 'approved' }
                          });
                        }}
                      >
                        Quick Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          updateApplicationMutation.mutate({
                            id: application.id,
                            updates: { status: 'rejected' }
                          });
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="text-center py-8 text-slate-500">
              No mentor applications found
            </div>
          )}
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Application: {selectedApplication?.applicantName}</DialogTitle>
              <DialogDescription>
                Review the semantic content and approve or reject this mentor application
              </DialogDescription>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Email:</strong> {selectedApplication.email}</div>
                    <div><strong>Phone:</strong> {selectedApplication.phone || 'Not provided'}</div>
                    <div><strong>Age:</strong> {selectedApplication.age || 'Not provided'}</div>
                    <div><strong>Experience:</strong> {selectedApplication.yearsExperience || 'Not provided'} years</div>
                  </div>
                  <div className="mt-2">
                    <strong>Bio:</strong>
                    <p className="text-slate-700 mt-1">{selectedApplication.bio}</p>
                  </div>
                </div>

                {/* Semantic Content */}
                {selectedApplication.lifeStories?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Life Stories ({selectedApplication.lifeStories.length})</h3>
                    <div className="space-y-3">
                      {selectedApplication.lifeStories.map((story: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3 bg-slate-50">
                          <div className="font-medium text-sm">{story.topic}</div>
                          <p className="text-sm text-slate-700 mt-1">{story.story}</p>
                          {story.lesson && (
                            <div className="text-sm text-blue-700 mt-2">
                              <strong>Lesson:</strong> {story.lesson}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topic Wisdom */}
                <div>
                  <h3 className="font-semibold mb-2">Topic-Specific Wisdom</h3>
                  <div className="grid gap-3">
                    {selectedApplication.careerWisdom && (
                      <div className="border rounded-lg p-3 bg-slate-50">
                        <strong className="text-sm">Career Wisdom:</strong>
                        <p className="text-sm text-slate-700 mt-1">{selectedApplication.careerWisdom}</p>
                      </div>
                    )}
                    {selectedApplication.relationshipAdvice && (
                      <div className="border rounded-lg p-3 bg-slate-50">
                        <strong className="text-sm">Relationship Advice:</strong>
                        <p className="text-sm text-slate-700 mt-1">{selectedApplication.relationshipAdvice}</p>
                      </div>
                    )}
                    {selectedApplication.purposeAndBelonging && (
                      <div className="border rounded-lg p-3 bg-slate-50">
                        <strong className="text-sm">Purpose & Belonging:</strong>
                        <p className="text-sm text-slate-700 mt-1">{selectedApplication.purposeAndBelonging}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Form */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Admin Review</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={reviewData.status}
                        onChange={(e) => setReviewData({...reviewData, status: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="pending">Pending</option>
                        <option value="interview_scheduled">Interview Scheduled</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    
                    {reviewData.status === 'interview_scheduled' && (
                      <div>
                        <Label htmlFor="interviewDate">Interview Date</Label>
                        <Input
                          id="interviewDate"
                          type="datetime-local"
                          value={reviewData.interviewDate}
                          onChange={(e) => setReviewData({...reviewData, interviewDate: e.target.value})}
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="adminNotes">Admin Notes</Label>
                      <Textarea
                        id="adminNotes"
                        value={reviewData.adminNotes}
                        onChange={(e) => setReviewData({...reviewData, adminNotes: e.target.value})}
                        placeholder="Add notes about this application..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSubmitReview} disabled={updateApplicationMutation.isPending}>
                        {updateApplicationMutation.isPending ? 'Updating...' : 'Update Application'}
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}