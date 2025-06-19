import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Users, Settings, Shield, Plus, Trash2, Edit, X } from "lucide-react";

// Types
interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  createdAt: string;
}

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
  lifeStories: any[];
  challenges: any[];
  quotes: any[];
  principles: any[];
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
  const [activeTab, setActiveTab] = useState("organizations");
  
  // Dialog states
  const [selectedApplication, setSelectedApplication] = useState<MentorApplication | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedAiMentor, setSelectedAiMentor] = useState<AiMentor | null>(null);
  
  // Semantic configuration state
  const [semanticConfig, setSemanticConfig] = useState({
    detailedBackground: '',
    communicationStyle: '',
    decisionMaking: '',
    mentoring: '',
    coreValues: [] as string[],
    conversationStarters: [] as string[],
    advicePatterns: '',
    responseExamples: '',
    contextAwarenessRules: '',
    storySelectionLogic: '',
    personalityConsistencyRules: '',
    conversationFlowPatterns: '',
    commonPhrases: [] as string[]
  });
  
  const [mentorStories, setMentorStories] = useState<any[]>([]);
  const [newStory, setNewStory] = useState({
    category: '',
    title: '',
    story: '',
    lesson: '',
    keywords: '',
    emotionalTone: ''
  });
  
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

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    retry: false
  });

  // Load semantic configuration when mentor is selected
  const { data: semanticData, refetch: refetchSemantic } = useQuery({
    queryKey: ['/api/admin/ai-mentors', selectedAiMentor?.id, 'semantic'],
    enabled: !!selectedAiMentor?.id,
    retry: false,
  });

  // Load semantic data into form state
  useEffect(() => {
    if (semanticData && selectedAiMentor) {
      const config = semanticData.semanticConfig || {};
      setSemanticConfig({
        detailedBackground: config.detailedBackground || '',
        communicationStyle: config.communicationStyle || '',
        decisionMaking: config.decisionMaking || '',
        mentoring: config.mentoring || '',
        coreValues: config.coreValues || [],
        conversationStarters: config.conversationStarters || [],
        advicePatterns: config.advicePatterns || '',
        responseExamples: config.responseExamples || '',
        contextAwarenessRules: config.contextAwarenessRules || '',
        storySelectionLogic: config.storySelectionLogic || '',
        personalityConsistencyRules: config.personalityConsistencyRules || '',
        conversationFlowPatterns: config.conversationFlowPatterns || '',
        commonPhrases: config.commonPhrases || []
      });
      setMentorStories(semanticData.stories || []);
    }
  }, [semanticData, selectedAiMentor]);

  // Add story function
  const addStory = () => {
    if (!newStory.category || !newStory.title) {
      toast({
        title: 'Error',
        description: 'Please fill in category and title',
        variant: 'destructive',
      });
      return;
    }
    
    const story = {
      ...newStory,
      id: Date.now(),
      keywords: newStory.keywords.split(',').map((k: string) => k.trim())
    };
    setMentorStories([...mentorStories, story]);
    setNewStory({
      category: '',
      title: '',
      story: '',
      lesson: '',
      keywords: '',
      emotionalTone: ''
    });
  };

  // Remove story function
  const removeStory = (index: number) => {
    setMentorStories(mentorStories.filter((_, i) => i !== index));
  };

  // Save semantic configuration
  const saveSemanticConfig = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/ai-mentors/${selectedAiMentor?.id}/semantic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semanticConfig: semanticConfig,
          stories: mentorStories
        }),
      });
      if (!response.ok) throw new Error('Failed to save semantic configuration');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Semantic configuration saved successfully',
      });
      refetchSemantic();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save semantic configuration',
        variant: 'destructive',
      });
    },
  });

  // Mutations (simplified for this fixed version)
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

  const updateAiMentorMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      return await apiRequest(`/api/admin/ai-mentors/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-mentors'] });
      toast({ title: "Success", description: "AI mentor updated successfully" });
    },
  });

  const handleUpdateAiMentor = (mentor: AiMentor, updates: any) => {
    updateAiMentorMutation.mutate({ id: mentor.id, ...updates });
    setSelectedAiMentor(null);
    setShowAiMentorDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="organizations" className="flex items-center space-x-1 text-xs sm:text-sm">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Organizations</span>
              <span className="sm:hidden">Orgs</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center space-x-1 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
            </TabsTrigger>
            <TabsTrigger value="ai-mentors" className="flex items-center space-x-1 text-xs sm:text-sm">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">AI Mentors</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="super-admin" className="flex items-center space-x-1 text-xs sm:text-sm">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Super Admin</span>
              <span className="sm:hidden">Super</span>
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Organizations</h2>
                <p className="text-slate-600">Manage community organizations and their settings</p>
              </div>
              <Button onClick={() => setShowOrgDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Organization
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <CardDescription className="mt-1">{org.description}</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrganization(org)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-500">
                      Created: {new Date(org.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI Mentors Tab */}
          <TabsContent value="ai-mentors" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Mentor Configuration</h2>
                <p className="text-slate-600">Configure AI mentor personalities and semantic behavior</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiMentors.map((mentor) => (
                <Card key={mentor.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{mentor.name}</CardTitle>
                        <CardDescription className="mt-1">{mentor.expertise}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={mentor.isActive ? "default" : "secondary"}>
                          {mentor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3">{mentor.personality}</p>
                    <Button 
                      onClick={() => {
                        setSelectedAiMentor(mentor);
                        setShowAiMentorDialog(true);
                      }}
                      className="w-full"
                      size="sm"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Semantic Layer
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Applications Tab - Simplified */}
          <TabsContent value="applications" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Mentor Applications</h2>
            <div className="grid gap-4">
              {applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <CardTitle>{app.applicantName}</CardTitle>
                    <CardDescription>{app.email} • {app.expertise}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Super Admin Tab - Simplified */}
          <TabsContent value="super-admin" className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Super Admin</h2>
            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <CardTitle>{user.username}</CardTitle>
                    <CardDescription>{user.email} • {user.role}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Mentor Semantic Configuration Dialog */}
      <Dialog open={showAiMentorDialog} onOpenChange={setShowAiMentorDialog}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg sm:text-xl">Configure AI Mentor</DialogTitle>
            <DialogDescription className="text-sm">
              Customize {selectedAiMentor?.name}'s personality, stories, and communication patterns
            </DialogDescription>
          </DialogHeader>
          
          {selectedAiMentor ? (
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 gap-0">
                <TabsTrigger value="basic" className="text-xs px-1">Info</TabsTrigger>
                <TabsTrigger value="personality" className="text-xs px-1">Style</TabsTrigger>
                <TabsTrigger value="stories" className="text-xs px-1">Stories</TabsTrigger>
                <TabsTrigger value="communication" className="text-xs px-1">Words</TabsTrigger>
                <TabsTrigger value="semantic" className="text-xs px-1">Rules</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-6">
                <h4 className="font-semibold text-slate-900 text-base">Basic Information</h4>
                <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  <div className="space-y-2">
                    <Label htmlFor="edit-mentor-name" className="text-sm font-medium block">Mentor Name</Label>
                    <Input
                      id="edit-mentor-name"
                      value={selectedAiMentor.name}
                      onChange={(e) => setSelectedAiMentor({ ...selectedAiMentor, name: e.target.value })}
                      placeholder="e.g., Marcus, David, Elder Thomas"
                      className="w-full text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mentor-expertise" className="text-sm font-medium block">Expertise Domain</Label>
                    <Input
                      id="edit-mentor-expertise"
                      value={selectedAiMentor.expertise}
                      onChange={(e) => setSelectedAiMentor({ ...selectedAiMentor, expertise: e.target.value })}
                      placeholder="e.g., Life wisdom, Business leadership"
                      className="w-full text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mentor-core-identity" className="text-sm font-medium block">Core Identity</Label>
                  <Textarea
                    id="edit-mentor-core-identity"
                    value={selectedAiMentor.personality}
                    onChange={(e) => setSelectedAiMentor({ ...selectedAiMentor, personality: e.target.value })}
                    rows={3}
                    className="w-full text-sm"
                    placeholder="Brief description of who they are (e.g., Navy vet, recovered alcoholic, father of 5, quietly wise)"
                  />
                </div>
              </TabsContent>

              {/* Personality Tab */}
              <TabsContent value="personality" className="space-y-6">
                <h4 className="font-semibold text-slate-900">Personality Traits & Background</h4>
                <div>
                  <Label htmlFor="detailed-background">Detailed Background</Label>
                  <p className="text-sm text-slate-500 mb-2">Complete life story including career, relationships, challenges overcome</p>
                  <Textarea
                    id="detailed-background"
                    value={semanticConfig.detailedBackground}
                    onChange={(e) => setSemanticConfig({...semanticConfig, detailedBackground: e.target.value})}
                    rows={4}
                    placeholder="Navy veteran, 20 years active duty, father of 3, struggled with alcohol in his 30s but found recovery through faith and AA, built successful consulting business after military..."
                  />
                </div>
                <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  <div>
                    <Label htmlFor="communication-style" className="block text-sm font-medium mb-1">Communication Style</Label>
                    <p className="text-xs text-slate-500 mb-2">How they speak and interact with people</p>
                    <Textarea
                      id="communication-style"
                      value={semanticConfig.communicationStyle}
                      onChange={(e) => setSemanticConfig({...semanticConfig, communicationStyle: e.target.value})}
                      rows={3}
                      className="w-full text-sm"
                      placeholder="Direct but gentle, uses metaphors from military life, thoughtful pauses, asks follow-up questions, doesn't rush to give advice"
                    />
                  </div>
                  <div>
                    <Label htmlFor="decision-making" className="block text-sm font-medium mb-1">Decision-Making Approach</Label>
                    <p className="text-xs text-slate-500 mb-2">How they analyze problems and make decisions</p>
                    <Textarea
                      id="decision-making"
                      value={semanticConfig.decisionMaking}
                      onChange={(e) => setSemanticConfig({...semanticConfig, decisionMaking: e.target.value})}
                      rows={3}
                      className="w-full text-sm"
                      placeholder="Values-based, considers long-term character impact, weighs consequences on family, trusts gut instinct backed by experience"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="mentoring-style">Mentoring Style</Label>
                  <p className="text-sm text-slate-500 mb-2">How they guide and teach others</p>
                  <Textarea
                    id="mentoring-style"
                    value={semanticConfig.mentoring}
                    onChange={(e) => setSemanticConfig({...semanticConfig, mentoring: e.target.value})}
                    rows={3}
                    placeholder="Shares personal stories and failures openly, emphasizes growth through difficulty, holds people accountable with love, doesn't enable excuses"
                  />
                </div>
                <div>
                  <Label htmlFor="core-values">Core Values</Label>
                  <p className="text-sm text-slate-500 mb-2">Fundamental principles that guide their life (one per line)</p>
                  <Textarea
                    id="core-values"
                    value={semanticConfig.coreValues.join('\n')}
                    onChange={(e) => setSemanticConfig({...semanticConfig, coreValues: e.target.value.split('\n').filter(v => v.trim())})}
                    rows={4}
                    placeholder="Integrity above all else&#10;Family comes first&#10;Service to others&#10;Growth through adversity&#10;Accountability in all things"
                  />
                </div>
              </TabsContent>

              {/* Life Stories Tab */}
              <TabsContent value="stories" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">Life Stories & Experiences</h4>
                  <Button size="sm" variant="outline" onClick={addStory}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Story
                  </Button>
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  Add authentic stories that define this mentor's character and wisdom. These will be used to make conversations feel personal and authentic.
                </div>
                
                {/* New Story Form */}
                <Card className="p-4 bg-slate-50">
                  <h5 className="font-medium mb-3">Add New Story</h5>
                  <div className="space-y-3">
                    <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
                      <div>
                        <Label htmlFor="story-category" className="block text-sm font-medium mb-1">Category</Label>
                        <Select value={newStory.category} onValueChange={(value) => setNewStory({...newStory, category: value})}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="childhood">Childhood Snapshot</SelectItem>
                            <SelectItem value="father">Relationship with Father</SelectItem>
                            <SelectItem value="mother">Relationship with Mother</SelectItem>
                            <SelectItem value="marriage">Marriage - Struggles & Triumphs</SelectItem>
                            <SelectItem value="parenting">Parenting Challenges</SelectItem>
                            <SelectItem value="career">Career Journey</SelectItem>
                            <SelectItem value="spiritual">Spiritual Insights</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="story-title" className="block text-sm font-medium mb-1">Story Title</Label>
                        <Input 
                          value={newStory.title}
                          onChange={(e) => setNewStory({...newStory, title: e.target.value})}
                          placeholder="e.g., The Dark Basement"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="story-emotional-tone" className="block text-sm font-medium mb-1">Emotional Tone</Label>
                        <Input 
                          value={newStory.emotionalTone}
                          onChange={(e) => setNewStory({...newStory, emotionalTone: e.target.value})}
                          placeholder="reflective, hopeful"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="story-content">Story Content</Label>
                      <Textarea
                        id="story-content"
                        value={newStory.story}
                        onChange={(e) => setNewStory({...newStory, story: e.target.value})}
                        rows={4}
                        placeholder="Write the full story in first person, as if the mentor is telling it directly..."
                      />
                    </div>
                    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                      <div>
                        <Label htmlFor="story-lesson" className="block text-sm font-medium mb-1">Key Lesson/Wisdom</Label>
                        <Textarea
                          id="story-lesson"
                          value={newStory.lesson}
                          onChange={(e) => setNewStory({...newStory, lesson: e.target.value})}
                          rows={2}
                          className="w-full text-sm"
                          placeholder="What wisdom or principle does this story teach?"
                        />
                      </div>
                      <div>
                        <Label htmlFor="story-keywords" className="block text-sm font-medium mb-1">Keywords (comma-separated)</Label>
                        <Input 
                          value={newStory.keywords}
                          onChange={(e) => setNewStory({...newStory, keywords: e.target.value})}
                          placeholder="courage, fear, childhood"
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                    <Button onClick={addStory} size="sm" className="mt-3">
                      Add Story to Collection
                    </Button>
                  </div>
                </Card>

                {/* Existing Stories Display */}
                {mentorStories.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-slate-900">Existing Stories</h5>
                    {mentorStories.map((story, index) => (
                      <Card key={story.id || index} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">{story.category}</span>
                            <h6 className="font-medium mt-1">{story.title}</h6>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeStory(index)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{story.story}</p>
                        <p className="text-xs text-slate-500 mt-1"><strong>Lesson:</strong> {story.lesson}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Communication Tab */}
              <TabsContent value="communication" className="space-y-6">
                <h4 className="font-semibold text-slate-900">Communication Patterns</h4>
                
                <div>
                  <Label htmlFor="signature-phrases">Signature Phrases</Label>
                  <p className="text-sm text-slate-500 mb-2">Unique sayings and phrases this mentor uses naturally (one per line)</p>
                  <Textarea
                    id="signature-phrases"
                    value={semanticConfig.commonPhrases.join('\n')}
                    onChange={(e) => setSemanticConfig({...semanticConfig, commonPhrases: e.target.value.split('\n').filter(p => p.trim())})}
                    rows={4}
                    placeholder="You know what I mean?&#10;Let me tell you something&#10;Back in my day&#10;Here's the thing about life"
                  />
                </div>
                
                <div>
                  <Label htmlFor="conversation-starters">Conversation Starters</Label>
                  <p className="text-sm text-slate-500 mb-2">How they typically begin conversations (one per line)</p>
                  <Textarea
                    id="conversation-starters"
                    value={semanticConfig.conversationStarters.join('\n')}
                    onChange={(e) => setSemanticConfig({...semanticConfig, conversationStarters: e.target.value.split('\n').filter(s => s.trim())})}
                    rows={3}
                    placeholder="What's on your mind today?&#10;Tell me what's really bothering you&#10;I've been thinking about what you said"
                  />
                </div>
                
                <div>
                  <Label htmlFor="advice-patterns">Advice Patterns</Label>
                  <p className="text-sm text-slate-500 mb-2">How they structure and deliver guidance</p>
                  <Textarea
                    id="advice-patterns"
                    value={semanticConfig.advicePatterns}
                    onChange={(e) => setSemanticConfig({...semanticConfig, advicePatterns: e.target.value})}
                    rows={3}
                    placeholder="Starts with personal story, asks clarifying questions, offers practical steps, ends with encouragement"
                  />
                </div>
                
                <div>
                  <Label htmlFor="response-examples">Response Examples</Label>
                  <p className="text-sm text-slate-500 mb-2">Sample responses that capture their voice and style</p>
                  <Textarea
                    id="response-examples"
                    value={semanticConfig.responseExamples}
                    onChange={(e) => setSemanticConfig({...semanticConfig, responseExamples: e.target.value})}
                    rows={4}
                    placeholder="When someone asks about career change: 'You know, I switched careers three times before I found my calling. Let me ask you - what scares you more, staying where you are or taking the leap?'"
                  />
                </div>
              </TabsContent>

              {/* Semantic Layer Tab */}
              <TabsContent value="semantic" className="space-y-6">
                <h4 className="font-semibold text-slate-900">Advanced Semantic Configuration</h4>
                
                <div>
                  <Label htmlFor="context-awareness">Context Awareness Rules</Label>
                  <p className="text-sm text-slate-500 mb-2">How they adapt responses based on conversation context</p>
                  <Textarea
                    id="context-awareness"
                    value={semanticConfig.contextAwarenessRules}
                    onChange={(e) => setSemanticConfig({...semanticConfig, contextAwarenessRules: e.target.value})}
                    rows={3}
                    placeholder="If user mentions family issues, prioritize family-related stories; if discussing career, draw from business experience"
                  />
                </div>
                
                <div>
                  <Label htmlFor="story-selection">Story Selection Logic</Label>
                  <p className="text-sm text-slate-500 mb-2">Guidelines for when to share specific types of stories</p>
                  <Textarea
                    id="story-selection"
                    value={semanticConfig.storySelectionLogic}
                    onChange={(e) => setSemanticConfig({...semanticConfig, storySelectionLogic: e.target.value})}
                    rows={3}
                    placeholder="Share childhood stories for foundational issues, career stories for professional growth, spiritual stories for meaning-making"
                  />
                </div>
                
                <div>
                  <Label htmlFor="personality-consistency">Personality Consistency Rules</Label>
                  <p className="text-sm text-slate-500 mb-2">Guidelines to maintain character consistency</p>
                  <Textarea
                    id="personality-consistency"
                    value={semanticConfig.personalityConsistencyRules}
                    onChange={(e) => setSemanticConfig({...semanticConfig, personalityConsistencyRules: e.target.value})}
                    rows={3}
                    placeholder="Always maintain military bearing, never give advice without sharing personal experience first, prioritize practical solutions"
                  />
                </div>
                
                <div>
                  <Label htmlFor="conversation-flow">Conversation Flow Patterns</Label>
                  <p className="text-sm text-slate-500 mb-2">How conversations typically develop and progress</p>
                  <Textarea
                    id="conversation-flow"
                    value={semanticConfig.conversationFlowPatterns}
                    onChange={(e) => setSemanticConfig({...semanticConfig, conversationFlowPatterns: e.target.value})}
                    rows={3}
                    placeholder="Listen first, ask follow-up questions, share relevant experience, offer perspective, suggest actionable next steps"
                  />
                </div>
              </TabsContent>

              {/* Save Configuration Button */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAiMentor(null);
                    setShowAiMentorDialog(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveSemanticConfig.mutate({})}
                  disabled={saveSemanticConfig.isPending}
                  className="w-full sm:w-auto"
                >
                  {saveSemanticConfig.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Loading mentor configuration...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Organization Creation Dialog */}
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
              <Button 
                onClick={() => {
                  if (!orgForm.name.trim()) return;
                  createOrgMutation.mutate(orgForm);
                }} 
                disabled={createOrgMutation.isPending}
              >
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
                  value={selectedOrganization.name}
                  onChange={(e) => setSelectedOrganization({ ...selectedOrganization, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-org-description">Description</Label>
                <Textarea
                  id="edit-org-description"
                  value={selectedOrganization.description}
                  onChange={(e) => setSelectedOrganization({ ...selectedOrganization, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedOrganization(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    updateOrgMutation.mutate({ 
                      id: selectedOrganization.id, 
                      updates: {
                        name: selectedOrganization.name,
                        description: selectedOrganization.description
                      }
                    });
                  }}
                  disabled={updateOrgMutation.isPending}
                >
                  {updateOrgMutation.isPending ? 'Updating...' : 'Update Organization'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}