import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2,
  Bot,
  Users,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  Brain,
  MessageSquare,
  Heart,
  Quote,
  Lightbulb,
  Clock,
  Shield,
  Crown,
  User,
  Calendar
} from "lucide-react";

interface Organization {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

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
  organizationId?: number;
  createdAt: string;
}

interface AiMentor {
  id: number;
  name: string;
  personality: string;
  expertise: string;
  organizationId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("organizations");
  
  // Dialog states
  const [selectedApplication, setSelectedApplication] = useState<MentorApplication | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedAiMentor, setSelectedAiMentor] = useState<AiMentor | null>(null);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showAiMentorDialog, setShowAiMentorDialog] = useState(false);
  
  // Form states
  const [orgForm, setOrgForm] = useState({ name: '', description: '' });
  const [aiMentorForm, setAiMentorForm] = useState({
    name: '',
    personality: '',
    expertise: '',
    organizationId: '',
    isActive: true
  });
  const [reviewData, setReviewData] = useState({
    status: '',
    adminNotes: '',
    interviewDate: '',
    organizationId: ''
  });

  // Data queries
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ['/api/admin/organizations'],
    retry: false
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery<MentorApplication[]>({
    queryKey: ['/api/admin/mentor-applications'],
    retry: false
  });

  const { data: aiMentors = [], isLoading: aiMentorsLoading } = useQuery<AiMentor[]>({
    queryKey: ['/api/admin/ai-mentors'],
    retry: false
  });

  // Mutations
  const createOrgMutation = useMutation({
    mutationFn: async (orgData: any) => {
      return await apiRequest('/api/admin/organizations', 'POST', orgData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setShowOrgDialog(false);
      setOrgForm({ name: '', description: '' });
      toast({ title: "Success", description: "Organization created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create organization", variant: "destructive" });
    }
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/admin/organizations/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setSelectedOrganization(null);
      toast({ title: "Success", description: "Organization updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update organization", variant: "destructive" });
    }
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/organizations/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      toast({ title: "Success", description: "Organization deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete organization", variant: "destructive" });
    }
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/admin/mentor-applications/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/mentor-applications'] });
      setSelectedApplication(null);
      toast({ title: "Success", description: "Application updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update application", variant: "destructive" });
    }
  });

  const createAiMentorMutation = useMutation({
    mutationFn: async (mentorData: any) => {
      return await apiRequest('/api/admin/ai-mentors', 'POST', mentorData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-mentors'] });
      setShowAiMentorDialog(false);
      setAiMentorForm({ name: '', personality: '', expertise: '', organizationId: '', isActive: true });
      toast({ title: "Success", description: "AI mentor created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create AI mentor", variant: "destructive" });
    }
  });

  const updateAiMentorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/admin/ai-mentors/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-mentors'] });
      setSelectedAiMentor(null);
      toast({ title: "Success", description: "AI mentor updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update AI mentor", variant: "destructive" });
    }
  });

  // Event handlers
  const handleCreateOrg = () => {
    if (!orgForm.name.trim()) return;
    createOrgMutation.mutate(orgForm);
  };

  const handleUpdateOrg = (org: Organization, updates: any) => {
    updateOrgMutation.mutate({ id: org.id, updates });
  };

  const handleDeleteOrg = (id: number) => {
    if (confirm('Are you sure you want to delete this organization?')) {
      deleteOrgMutation.mutate(id);
    }
  };

  const handleReviewApplication = (application: MentorApplication) => {
    setSelectedApplication(application);
    setReviewData({
      status: application.status,
      adminNotes: application.adminNotes || '',
      interviewDate: application.interviewDate || '',
      organizationId: application.organizationId?.toString() || ''
    });
  };

  const handleUpdateApplication = () => {
    if (!selectedApplication) return;
    updateApplicationMutation.mutate({
      id: selectedApplication.id,
      updates: {
        ...reviewData,
        organizationId: reviewData.organizationId ? parseInt(reviewData.organizationId) : null
      }
    });
  };

  const handleCreateAiMentor = () => {
    if (!aiMentorForm.name.trim()) return;
    createAiMentorMutation.mutate({
      ...aiMentorForm,
      organizationId: aiMentorForm.organizationId ? parseInt(aiMentorForm.organizationId) : null
    });
  };

  const handleUpdateAiMentor = (mentor: AiMentor, updates: any) => {
    updateAiMentorMutation.mutate({ id: mentor.id, updates });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-slate-300">
                  <div className="text-white font-bold text-sm">M</div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Mentra Admin</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="organizations" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Organizations</span>
            </TabsTrigger>
            <TabsTrigger value="mentors" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Mentor Applications</span>
            </TabsTrigger>
            <TabsTrigger value="ai-mentors" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>AI Mentors</span>
            </TabsTrigger>
            <TabsTrigger value="super-admin" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Super Admin</span>
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Organization Management</h2>
                <p className="text-slate-600">Create and manage organizations on the platform</p>
              </div>
              <Button onClick={() => setShowOrgDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Organization
              </Button>
            </div>

            <div className="grid gap-6">
              {orgsLoading ? (
                <div className="text-center py-8">Loading organizations...</div>
              ) : organizations.length > 0 ? (
                organizations.map((org) => (
                  <Card key={org.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{org.name}</CardTitle>
                          <p className="text-sm text-slate-600 mt-1">{org.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrganization(org)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrg(org.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-slate-500">
                        Created: {new Date(org.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No organizations found. Create your first organization to get started.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mentor Applications Tab */}
          <TabsContent value="mentors" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Mentor Application Workflow</h2>
              <p className="text-slate-600">Review and approve mentor applications with semantic content</p>
            </div>

            <div className="grid gap-6">
              {appsLoading ? (
                <div className="text-center py-8">Loading applications...</div>
              ) : applications.length > 0 ? (
                applications.map((application) => (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{application.applicantName}</CardTitle>
                          <p className="text-sm text-slate-600">{application.email}</p>
                          <p className="text-sm text-slate-600">{application.expertise}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              application.status === 'approved' ? 'default' : 
                              application.status === 'rejected' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {application.status.replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewApplication(application)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Experience:</span> {application.yearsExperience || 'N/A'} years
                        </div>
                        <div>
                          <span className="font-medium">Applied:</span> {new Date(application.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {application.bio && (
                        <div className="mt-3">
                          <p className="text-sm text-slate-600 line-clamp-2">{application.bio}</p>
                        </div>
                      )}
                      <div className="flex items-center space-x-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {application.lifeStories?.length || 0} stories
                        </span>
                        <span className="flex items-center">
                          <Heart className="w-3 h-3 mr-1" />
                          {application.challenges?.length || 0} challenges
                        </span>
                        <span className="flex items-center">
                          <Quote className="w-3 h-3 mr-1" />
                          {application.quotes?.length || 0} quotes
                        </span>
                        <span className="flex items-center">
                          <Lightbulb className="w-3 h-3 mr-1" />
                          {application.principles?.length || 0} principles
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No mentor applications found
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI Mentors Tab */}
          <TabsContent value="ai-mentors" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Mentor Configuration</h2>
                <p className="text-slate-600">Manage AI mentor personalities and configurations</p>
              </div>
              <Button onClick={() => setShowAiMentorDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add AI Mentor
              </Button>
            </div>

            <div className="grid gap-6">
              {aiMentorsLoading ? (
                <div className="text-center py-8">Loading AI mentors...</div>
              ) : aiMentors.length > 0 ? (
                aiMentors.map((mentor) => (
                  <Card key={mentor.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            <Brain className="w-5 h-5 mr-2 text-slate-600" />
                            {mentor.name}
                          </CardTitle>
                          <p className="text-sm text-slate-600 mt-1">{mentor.expertise}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={mentor.isActive ? 'default' : 'secondary'}>
                            {mentor.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAiMentor(mentor)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 line-clamp-2">{mentor.personality}</p>
                      <div className="mt-3 text-xs text-slate-500">
                        Organization: {organizations.find(org => org.id === mentor.organizationId)?.name || 'Global'}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No AI mentors configured yet
                </div>
              )}
            </div>
          </TabsContent>

          {/* Super Admin Tab */}
          <TabsContent value="super-admin" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                <p className="text-slate-600">Manage user roles and permissions across the platform</p>
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Platform Users</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-600">
                    User role management coming soon - super admin controls for promoting users to admin status
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Organization Dialog */}
      <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <Label htmlFor="org-description">Description</Label>
              <Textarea
                id="org-description"
                value={orgForm.description}
                onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                placeholder="Enter organization description"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowOrgDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrg} disabled={createOrgMutation.isPending}>
                {createOrgMutation.isPending ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={!!selectedOrganization} onOpenChange={() => setSelectedOrganization(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details
            </DialogDescription>
          </DialogHeader>
          {selectedOrganization && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-org-name">Organization Name</Label>
                <Input
                  id="edit-org-name"
                  defaultValue={selectedOrganization.name}
                  onChange={(e) => setSelectedOrganization({ ...selectedOrganization, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-org-description">Description</Label>
                <Textarea
                  id="edit-org-description"
                  defaultValue={selectedOrganization.description}
                  onChange={(e) => setSelectedOrganization({ ...selectedOrganization, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedOrganization(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateOrg(selectedOrganization, {
                  name: selectedOrganization.name,
                  description: selectedOrganization.description
                })}>
                  Update Organization
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Application Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Mentor Application</DialogTitle>
            <DialogDescription>
              Review application details and semantic content
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Applicant Name</Label>
                  <p className="text-sm font-medium">{selectedApplication.applicantName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedApplication.email}</p>
                </div>
                <div>
                  <Label>Expertise</Label>
                  <p className="text-sm">{selectedApplication.expertise}</p>
                </div>
                <div>
                  <Label>Experience</Label>
                  <p className="text-sm">{selectedApplication.yearsExperience || 'N/A'} years</p>
                </div>
              </div>

              {/* Bio */}
              {selectedApplication.bio && (
                <div>
                  <Label>Bio</Label>
                  <p className="text-sm text-slate-600">{selectedApplication.bio}</p>
                </div>
              )}

              {/* Semantic Content */}
              <div className="space-y-4">
                <h4 className="font-medium">Semantic Content for AI Training</h4>
                
                {selectedApplication.lifeStories?.length > 0 && (
                  <div>
                    <Label className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Life Stories ({selectedApplication.lifeStories.length})
                    </Label>
                    <div className="mt-2 space-y-2">
                      {selectedApplication.lifeStories.slice(0, 2).map((story: any, index: number) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-md">
                          <p className="text-sm font-medium">{story.topic}</p>
                          <p className="text-xs text-slate-600 line-clamp-2">{story.story}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedApplication.quotes?.length > 0 && (
                  <div>
                    <Label className="flex items-center">
                      <Quote className="w-4 h-4 mr-1" />
                      Key Quotes ({selectedApplication.quotes.length})
                    </Label>
                    <div className="mt-2 space-y-2">
                      {selectedApplication.quotes.slice(0, 2).map((quote: any, index: number) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-md">
                          <p className="text-sm italic">"{quote.quote}"</p>
                          <p className="text-xs text-slate-600">{quote.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Review Form */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Review Decision</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={reviewData.status} onValueChange={(value) => setReviewData({ ...reviewData, status: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="organization">Assign to Organization</Label>
                    <Select value={reviewData.organizationId} onValueChange={(value) => setReviewData({ ...reviewData, organizationId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No organization</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="admin-notes">Admin Notes</Label>
                  <Textarea
                    id="admin-notes"
                    value={reviewData.adminNotes}
                    onChange={(e) => setReviewData({ ...reviewData, adminNotes: e.target.value })}
                    placeholder="Add notes about this application"
                  />
                </div>
                {reviewData.status === 'interview_scheduled' && (
                  <div>
                    <Label htmlFor="interview-date">Interview Date</Label>
                    <Input
                      id="interview-date"
                      type="datetime-local"
                      value={reviewData.interviewDate}
                      onChange={(e) => setReviewData({ ...reviewData, interviewDate: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateApplication} disabled={updateApplicationMutation.isPending}>
                  {updateApplicationMutation.isPending ? 'Updating...' : 'Update Application'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Mentor Dialog */}
      <Dialog open={showAiMentorDialog} onOpenChange={setShowAiMentorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create AI Mentor</DialogTitle>
            <DialogDescription>
              Configure a new AI mentor personality
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mentor-name">Mentor Name</Label>
                <Input
                  id="mentor-name"
                  value={aiMentorForm.name}
                  onChange={(e) => setAiMentorForm({ ...aiMentorForm, name: e.target.value })}
                  placeholder="e.g., Marcus, David, Sarah"
                />
              </div>
              <div>
                <Label htmlFor="mentor-expertise">Expertise Domain</Label>
                <Input
                  id="mentor-expertise"
                  value={aiMentorForm.expertise}
                  onChange={(e) => setAiMentorForm({ ...aiMentorForm, expertise: e.target.value })}
                  placeholder="e.g., Business Strategy, Life Coaching"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mentor-personality">Personality & Background</Label>
              <Textarea
                id="mentor-personality"
                value={aiMentorForm.personality}
                onChange={(e) => setAiMentorForm({ ...aiMentorForm, personality: e.target.value })}
                placeholder="Describe the mentor's personality, communication style, and background..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="mentor-org">Organization</Label>
              <Select value={aiMentorForm.organizationId} onValueChange={(value) => setAiMentorForm({ ...aiMentorForm, organizationId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (All Organizations)</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAiMentorDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAiMentor} disabled={createAiMentorMutation.isPending}>
                {createAiMentorMutation.isPending ? 'Creating...' : 'Create AI Mentor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit AI Mentor Dialog */}
      <Dialog open={!!selectedAiMentor} onOpenChange={() => setSelectedAiMentor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure AI Mentor</DialogTitle>
            <DialogDescription>
              Update AI mentor personality and settings
            </DialogDescription>
          </DialogHeader>
          {selectedAiMentor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-mentor-name">Mentor Name</Label>
                  <Input
                    id="edit-mentor-name"
                    defaultValue={selectedAiMentor.name}
                    onChange={(e) => setSelectedAiMentor({ ...selectedAiMentor, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mentor-expertise">Expertise Domain</Label>
                  <Input
                    id="edit-mentor-expertise"
                    defaultValue={selectedAiMentor.expertise}
                    onChange={(e) => setSelectedAiMentor({ ...selectedAiMentor, expertise: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-mentor-personality">Personality & Background</Label>
                <Textarea
                  id="edit-mentor-personality"
                  defaultValue={selectedAiMentor.personality}
                  onChange={(e) => setSelectedAiMentor({ ...selectedAiMentor, personality: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-mentor-org">Organization</Label>
                  <Select 
                    defaultValue={selectedAiMentor.organizationId?.toString() || ""} 
                    onValueChange={(value) => setSelectedAiMentor({ 
                      ...selectedAiMentor, 
                      organizationId: value ? parseInt(value) : undefined 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Global (All Organizations)</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-mentor-active">Status</Label>
                  <Select 
                    defaultValue={selectedAiMentor.isActive.toString()} 
                    onValueChange={(value) => setSelectedAiMentor({ 
                      ...selectedAiMentor, 
                      isActive: value === 'true' 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedAiMentor(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateAiMentor(selectedAiMentor, {
                  name: selectedAiMentor.name,
                  expertise: selectedAiMentor.expertise,
                  personality: selectedAiMentor.personality,
                  organizationId: selectedAiMentor.organizationId,
                  isActive: selectedAiMentor.isActive
                })}>
                  Update AI Mentor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}