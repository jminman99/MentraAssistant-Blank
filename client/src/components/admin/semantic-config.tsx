import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SemanticConfiguration {
  id: number;
  mentorName: string;
  communicationStyle: string;
  commonPhrases: string[];
  decisionMaking: string;
  mentoring: string;
  organizationId?: number;
  isActive: boolean;
}

interface MentorPersonality {
  id: number;
  mentorName: string;
  customBackstory?: string;
  customExpertise?: string;
  customPersonality?: string;
  organizationId?: number;
  isActive: boolean;
}

export function SemanticConfigurationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("configurations");

  const { data: semanticConfigs, isLoading: configsLoading } = useQuery<SemanticConfiguration[]>({
    queryKey: ["/api/semantic-configurations"],
  });

  const { data: personalities, isLoading: personalitiesLoading } = useQuery<MentorPersonality[]>({
    queryKey: ["/api/mentor-personalities"],
  });

  const createConfigMutation = useMutation({
    mutationFn: (data: Partial<SemanticConfiguration>) =>
      apiRequest("/api/semantic-configurations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semantic-configurations"] });
      toast({ title: "Configuration created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create configuration", variant: "destructive" });
    },
  });

  const createPersonalityMutation = useMutation({
    mutationFn: (data: Partial<MentorPersonality>) =>
      apiRequest("/api/mentor-personalities", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-personalities"] });
      toast({ title: "Personality created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create personality", variant: "destructive" });
    },
  });

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const phrases = (formData.get("commonPhrases") as string).split('\n').filter(Boolean);
    
    createConfigMutation.mutate({
      mentorName: formData.get("mentorName") as string,
      communicationStyle: formData.get("communicationStyle") as string,
      commonPhrases: phrases,
      decisionMaking: formData.get("decisionMaking") as string,
      mentoring: formData.get("mentoring") as string,
    });
    
    e.currentTarget.reset();
  };

  const handleCreatePersonality = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPersonalityMutation.mutate({
      mentorName: formData.get("mentorName") as string,
      customBackstory: formData.get("customBackstory") as string,
      customExpertise: formData.get("customExpertise") as string,
      customPersonality: formData.get("customPersonality") as string,
    });
    
    e.currentTarget.reset();
  };

  const mentorNames = ["Marcus", "David", "Robert", "James", "Michael"];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Mentor Configuration</h1>
        <p className="text-muted-foreground">
          Customize AI mentor personalities and communication patterns for your organization
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configurations">Communication Patterns</TabsTrigger>
          <TabsTrigger value="personalities">Personality Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Communication Configuration</CardTitle>
              <CardDescription>
                Define how a mentor communicates, including style, phrases, and decision-making approach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mentorName">Mentor Name</Label>
                    <select name="mentorName" className="w-full p-2 border rounded" required>
                      <option value="">Select a mentor</option>
                      {mentorNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="communicationStyle">Communication Style</Label>
                    <Input name="communicationStyle" placeholder="e.g., Direct, analytical, uses tech metaphors" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="commonPhrases">Common Phrases (one per line)</Label>
                  <Textarea 
                    name="commonPhrases" 
                    placeholder="Let me break this down systematically&#10;From my CTO experience&#10;Think of it like architecting a system"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="decisionMaking">Decision-Making Approach</Label>
                  <Input name="decisionMaking" placeholder="e.g., Systems-thinking, considers scalability and future trends" required />
                </div>

                <div>
                  <Label htmlFor="mentoring">Mentoring Style</Label>
                  <Input name="mentoring" placeholder="e.g., Encourages experimentation, focuses on learning from failure" required />
                </div>

                <Button type="submit" disabled={createConfigMutation.isPending}>
                  {createConfigMutation.isPending ? "Creating..." : "Create Configuration"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Current Configurations</h3>
            {configsLoading ? (
              <div>Loading configurations...</div>
            ) : semanticConfigs?.length ? (
              semanticConfigs.map((config) => (
                <Card key={config.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{config.mentorName}</CardTitle>
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Communication Style:</Label>
                      <p className="text-sm text-muted-foreground">{config.communicationStyle}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Decision Making:</Label>
                      <p className="text-sm text-muted-foreground">{config.decisionMaking}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Mentoring Style:</Label>
                      <p className="text-sm text-muted-foreground">{config.mentoring}</p>
                    </div>
                    {config.commonPhrases?.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Common Phrases:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.commonPhrases.slice(0, 3).map((phrase, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              "{phrase}"
                            </Badge>
                          ))}
                          {config.commonPhrases.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{config.commonPhrases.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No configurations found. Create your first configuration above.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="personalities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Personality Profile</CardTitle>
              <CardDescription>
                Override mentor backstories, expertise, and personality traits for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePersonality} className="space-y-4">
                <div>
                  <Label htmlFor="mentorName">Mentor Name</Label>
                  <select name="mentorName" className="w-full p-2 border rounded" required>
                    <option value="">Select a mentor</option>
                    {mentorNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="customBackstory">Custom Backstory</Label>
                  <Textarea 
                    name="customBackstory" 
                    placeholder="Override the mentor's background story..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="customExpertise">Custom Expertise</Label>
                  <Input name="customExpertise" placeholder="Override the mentor's expertise areas..." />
                </div>

                <div>
                  <Label htmlFor="customPersonality">Custom Personality</Label>
                  <Textarea 
                    name="customPersonality" 
                    placeholder="Override the mentor's personality description..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={createPersonalityMutation.isPending}>
                  {createPersonalityMutation.isPending ? "Creating..." : "Create Personality"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Current Personality Overrides</h3>
            {personalitiesLoading ? (
              <div>Loading personalities...</div>
            ) : personalities?.length ? (
              personalities.map((personality) => (
                <Card key={personality.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{personality.mentorName}</CardTitle>
                      <Badge variant={personality.isActive ? "default" : "secondary"}>
                        {personality.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {personality.customExpertise && (
                      <div>
                        <Label className="text-sm font-medium">Custom Expertise:</Label>
                        <p className="text-sm text-muted-foreground">{personality.customExpertise}</p>
                      </div>
                    )}
                    {personality.customPersonality && (
                      <div>
                        <Label className="text-sm font-medium">Custom Personality:</Label>
                        <p className="text-sm text-muted-foreground">{personality.customPersonality}</p>
                      </div>
                    )}
                    {personality.customBackstory && (
                      <div>
                        <Label className="text-sm font-medium">Custom Backstory:</Label>
                        <p className="text-sm text-muted-foreground">{personality.customBackstory}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No personality overrides found. Create your first personality profile above.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}