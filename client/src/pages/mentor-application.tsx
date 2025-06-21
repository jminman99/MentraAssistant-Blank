import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SemanticStory {
  topic: string;
  story: string;
  lesson: string;
  keywords: string[];
}

interface Challenge {
  challenge: string;
  solution: string;
  wisdom: string;
  outcome: string;
}

interface Quote {
  quote: string;
  context: string;
  topic: string;
}

interface Principle {
  principle: string;
  explanation: string;
  application: string;
}

export default function MentorApplication() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Basic info state
  const [basicInfo, setBasicInfo] = useState({
    applicantName: "",
    email: "",
    phone: "",
    age: "",
    bio: "",
    expertise: "",
    yearsExperience: ""
  });

  // Semantic data state
  const [lifeStories, setLifeStories] = useState<SemanticStory[]>([
    { topic: "", story: "", lesson: "", keywords: [] }
  ]);
  const [challenges, setChallenges] = useState<Challenge[]>([
    { challenge: "", solution: "", wisdom: "", outcome: "" }
  ]);
  const [quotes, setQuotes] = useState<Quote[]>([
    { quote: "", context: "", topic: "" }
  ]);
  const [principles, setPrinciples] = useState<Principle[]>([
    { principle: "", explanation: "", application: "" }
  ]);

  // Topic-specific wisdom
  const [topicWisdom, setTopicWisdom] = useState({
    careerWisdom: "",
    relationshipAdvice: "",
    parentingInsights: "",
    addictionRecovery: "",
    spiritualGuidance: "",
    financialWisdom: "",
    mentalHealthSupport: "",
    purposeAndBelonging: ""
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/mentor-applications', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your mentor application has been submitted for review. We'll contact you soon.",
        variant: "default"
      });
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const applicationData = {
      ...basicInfo,
      age: basicInfo.age ? parseInt(basicInfo.age) : null,
      yearsExperience: basicInfo.yearsExperience ? parseInt(basicInfo.yearsExperience) : null,
      lifeStories: lifeStories.filter(story => story.topic && story.story),
      challenges: challenges.filter(challenge => challenge.challenge && challenge.solution),
      quotes: quotes.filter(quote => quote.quote),
      principles: principles.filter(principle => principle.principle),
      ...topicWisdom,
      organizationId: 1 // Default organization for now
    };

    submitMutation.mutate(applicationData);
  };

  const addSemanticItem = (type: 'story' | 'challenge' | 'quote' | 'principle') => {
    switch (type) {
      case 'story':
        setLifeStories([...lifeStories, { topic: "", story: "", lesson: "", keywords: [] }]);
        break;
      case 'challenge':
        setChallenges([...challenges, { challenge: "", solution: "", wisdom: "", outcome: "" }]);
        break;
      case 'quote':
        setQuotes([...quotes, { quote: "", context: "", topic: "" }]);
        break;
      case 'principle':
        setPrinciples([...principles, { principle: "", explanation: "", application: "" }]);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Become a Mentor
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Share your wisdom and life experience to guide the next generation. 
            Your stories, challenges, and insights will help train our AI mentors and inform experienced guide sessions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about yourself and your background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={basicInfo.applicantName}
                    onChange={(e) => setBasicInfo({...basicInfo, applicantName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={basicInfo.email}
                    onChange={(e) => setBasicInfo({...basicInfo, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={basicInfo.phone}
                    onChange={(e) => setBasicInfo({...basicInfo, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={basicInfo.age}
                    onChange={(e) => setBasicInfo({...basicInfo, age: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your background, and what makes you uniquely qualified to mentor others..."
                  value={basicInfo.bio}
                  onChange={(e) => setBasicInfo({...basicInfo, bio: e.target.value})}
                  rows={4}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expertise">Areas of Expertise *</Label>
                  <Input
                    id="expertise"
                    placeholder="e.g., Business Leadership, Marriage & Family, Financial Planning"
                    value={basicInfo.expertise}
                    onChange={(e) => setBasicInfo({...basicInfo, expertise: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={basicInfo.yearsExperience}
                    onChange={(e) => setBasicInfo({...basicInfo, yearsExperience: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Life Stories for AI Training */}
          <Card>
            <CardHeader>
              <CardTitle>Life Stories & Experiences</CardTitle>
              <CardDescription>
                Share stories from your life that contain valuable lessons. These help our AI mentors respond with authentic wisdom.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {lifeStories.map((story, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Topic/Area</Label>
                      <Input
                        placeholder="e.g., Career transition, Marriage challenge, Parenting"
                        value={story.topic}
                        onChange={(e) => {
                          const updated = [...lifeStories];
                          updated[index].topic = e.target.value;
                          setLifeStories(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Keywords</Label>
                      <Input
                        placeholder="e.g., leadership, failure, perseverance"
                        value={story.keywords.join(', ')}
                        onChange={(e) => {
                          const updated = [...lifeStories];
                          updated[index].keywords = e.target.value.split(', ').filter(k => k.trim());
                          setLifeStories(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Your Story</Label>
                    <Textarea
                      placeholder="Tell your story in detail - what happened, how you felt, what you learned..."
                      value={story.story}
                      onChange={(e) => {
                        const updated = [...lifeStories];
                        updated[index].story = e.target.value;
                        setLifeStories(updated);
                      }}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Key Lesson/Wisdom</Label>
                    <Textarea
                      placeholder="What wisdom would you share with someone facing a similar situation?"
                      value={story.lesson}
                      onChange={(e) => {
                        const updated = [...lifeStories];
                        updated[index].lesson = e.target.value;
                        setLifeStories(updated);
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addSemanticItem('story')}>
                Add Another Story
              </Button>
            </CardContent>
          </Card>

          {/* Topic-Specific Wisdom */}
          <Card>
            <CardHeader>
              <CardTitle>Topic-Specific Wisdom</CardTitle>
              <CardDescription>
                Share your insights on common life challenges. This helps our AI provide relevant guidance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="career">Career & Professional Development</Label>
                <Textarea
                  id="career"
                  placeholder="Share your wisdom about career growth, leadership, workplace challenges..."
                  value={topicWisdom.careerWisdom}
                  onChange={(e) => setTopicWisdom({...topicWisdom, careerWisdom: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="relationships">Marriage & Relationships</Label>
                <Textarea
                  id="relationships"
                  placeholder="Share your insights about building strong relationships, marriage, communication..."
                  value={topicWisdom.relationshipAdvice}
                  onChange={(e) => setTopicWisdom({...topicWisdom, relationshipAdvice: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="purpose">Purpose & Belonging</Label>
                <Textarea
                  id="purpose"
                  placeholder="Share wisdom about finding meaning, belonging, and purpose in life..."
                  value={topicWisdom.purposeAndBelonging}
                  onChange={(e) => setTopicWisdom({...topicWisdom, purposeAndBelonging: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parenting">Parenting & Family</Label>
                  <Textarea
                    id="parenting"
                    placeholder="Parenting wisdom..."
                    value={topicWisdom.parentingInsights}
                    onChange={(e) => setTopicWisdom({...topicWisdom, parentingInsights: e.target.value})}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="financial">Financial Wisdom</Label>
                  <Textarea
                    id="financial"
                    placeholder="Money management, investing..."
                    value={topicWisdom.financialWisdom}
                    onChange={(e) => setTopicWisdom({...topicWisdom, financialWisdom: e.target.value})}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="addiction">Addiction & Recovery</Label>
                  <Textarea
                    id="addiction"
                    placeholder="Insights about overcoming addiction..."
                    value={topicWisdom.addictionRecovery}
                    onChange={(e) => setTopicWisdom({...topicWisdom, addictionRecovery: e.target.value})}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="spiritual">Spiritual Guidance</Label>
                  <Textarea
                    id="spiritual"
                    placeholder="Faith, spirituality, meaning..."
                    value={topicWisdom.spiritualGuidance}
                    onChange={(e) => setTopicWisdom({...topicWisdom, spiritualGuidance: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button 
              type="submit" 
              size="lg" 
              disabled={submitMutation.isPending}
              className="px-8"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}