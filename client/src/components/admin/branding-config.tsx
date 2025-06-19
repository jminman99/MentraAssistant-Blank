import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Eye, Settings } from "lucide-react";

interface BrandingConfiguration {
  id: number;
  organizationId?: number;
  targetAudience: string;
  primaryTagline: string;
  secondaryTagline?: string;
  problemStatement: string;
  visionStatement: string;
  ctaText: string;
  colorScheme: string;
  mentorTerminology: string;
  tone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TARGET_AUDIENCES = [
  { value: "men-20-55", label: "Men 20-55 (Current Default)", description: "Professional men seeking wisdom and guidance" },
  { value: "business-professionals", label: "Business Professionals", description: "Corporate leaders and entrepreneurs" },
  { value: "women-entrepreneurs", label: "Women Entrepreneurs", description: "Female business owners and leaders" },
  { value: "young-professionals", label: "Young Professionals", description: "Career-focused individuals 22-35" },
  { value: "church-members", label: "Church Community", description: "Faith-based guidance and mentorship" },
  { value: "tech-workers", label: "Technology Workers", description: "Software engineers and tech professionals" },
];

const COLOR_SCHEMES = [
  { value: "masculine-slate", label: "Masculine Slate", description: "Dark slate/charcoal for professional men" },
  { value: "professional-blue", label: "Professional Blue", description: "Corporate blue and navy tones" },
  { value: "warm-earth", label: "Warm Earth", description: "Brown and warm neutral tones" },
  { value: "clean-minimal", label: "Clean Minimal", description: "Light grays and whites" },
  { value: "energetic-green", label: "Energetic Green", description: "Fresh green and teal accents" },
];

const MENTOR_TERMINOLOGY = [
  { value: "guides", label: "Guides", description: "Wisdom guides and experienced guides" },
  { value: "mentors", label: "Mentors", description: "Traditional mentorship language" },
  { value: "advisors", label: "Advisors", description: "Professional advisory relationship" },
  { value: "coaches", label: "Coaches", description: "Performance and goal-oriented coaching" },
];

const TONE_OPTIONS = [
  { value: "masculine-direct", label: "Masculine Direct", description: "Strong, confident, straightforward" },
  { value: "professional-warm", label: "Professional Warm", description: "Approachable yet authoritative" },
  { value: "inspiring-supportive", label: "Inspiring Supportive", description: "Motivational and encouraging" },
  { value: "analytical-precise", label: "Analytical Precise", description: "Data-driven and systematic" },
];

export function BrandingConfigurationPanel() {
  const [selectedConfig, setSelectedConfig] = useState<BrandingConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brandingConfigs, isLoading } = useQuery({
    queryKey: ["/api/admin/branding-configurations"],
    queryFn: () => apiRequest("/api/admin/branding-configurations"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<BrandingConfiguration>) =>
      apiRequest("/api/admin/branding-configurations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branding-configurations"] });
      toast({ title: "Branding configuration created successfully" });
      setIsEditing(false);
      setSelectedConfig(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<BrandingConfiguration> & { id: number }) =>
      apiRequest(`/api/admin/branding-configurations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branding-configurations"] });
      toast({ title: "Branding configuration updated successfully" });
      setIsEditing(false);
    },
  });

  const handleSave = (formData: FormData) => {
    const data = {
      targetAudience: formData.get("targetAudience") as string,
      primaryTagline: formData.get("primaryTagline") as string,
      secondaryTagline: formData.get("secondaryTagline") as string,
      problemStatement: formData.get("problemStatement") as string,
      visionStatement: formData.get("visionStatement") as string,
      ctaText: formData.get("ctaText") as string,
      colorScheme: formData.get("colorScheme") as string,
      mentorTerminology: formData.get("mentorTerminology") as string,
      tone: formData.get("tone") as string,
    };

    if (selectedConfig?.id) {
      updateMutation.mutate({ id: selectedConfig.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const startEditing = (config?: BrandingConfiguration) => {
    setSelectedConfig(config || null);
    setIsEditing(true);
    setPreviewMode(false);
  };

  if (isLoading) {
    return <div className="p-6">Loading branding configurations...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Branding & Messaging Configuration</h2>
          <p className="text-slate-600 mt-1">
            Configure different messaging themes for various target audiences and organizations
          </p>
        </div>
        <Button onClick={() => startEditing()} className="mentra-button">
          <Plus className="h-4 w-4 mr-2" />
          New Theme
        </Button>
      </div>

      <Tabs defaultValue="configurations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configurations">Current Configurations</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-4">
          <div className="grid gap-4">
            {brandingConfigs?.map((config: BrandingConfiguration) => (
              <Card key={config.id} className="mentra-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {TARGET_AUDIENCES.find(a => a.value === config.targetAudience)?.label || config.targetAudience}
                        {config.isActive && <Badge variant="secondary">Active</Badge>}
                      </CardTitle>
                      <p className="text-sm text-slate-600 mt-1">{config.primaryTagline}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConfig(config);
                          setPreviewMode(true);
                          setIsEditing(false);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(config)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">Color Scheme:</span>
                      <p className="text-slate-600">{COLOR_SCHEMES.find(c => c.value === config.colorScheme)?.label}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Terminology:</span>
                      <p className="text-slate-600">{MENTOR_TERMINOLOGY.find(m => m.value === config.mentorTerminology)?.label}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Tone:</span>
                      <p className="text-slate-600">{TONE_OPTIONS.find(t => t.value === config.tone)?.label}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">CTA:</span>
                      <p className="text-slate-600">"{config.ctaText}"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {selectedConfig && previewMode ? (
            <Card className="mentra-card p-8">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Live Preview: {selectedConfig.targetAudience}</h3>
                
                <div className="bg-slate-50 p-6 rounded-lg space-y-4">
                  <h1 className="text-3xl font-bold text-slate-900">{selectedConfig.primaryTagline}</h1>
                  {selectedConfig.secondaryTagline && (
                    <h2 className="text-xl text-slate-700">{selectedConfig.secondaryTagline}</h2>
                  )}
                  
                  <div className="space-y-4 text-slate-600">
                    <p><strong>Problem:</strong> {selectedConfig.problemStatement}</p>
                    <p><strong>Vision:</strong> {selectedConfig.visionStatement}</p>
                  </div>
                  
                  <Button className="mentra-button">
                    {selectedConfig.ctaText}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="mentra-card p-8 text-center">
              <p className="text-slate-600">Select a configuration to preview</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {isEditing && (
        <Card className="mentra-card">
          <CardHeader>
            <CardTitle>
              {selectedConfig ? "Edit Branding Configuration" : "Create New Branding Configuration"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Select name="targetAudience" defaultValue={selectedConfig?.targetAudience || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_AUDIENCES.map((audience) => (
                        <SelectItem key={audience.value} value={audience.value}>
                          <div>
                            <div className="font-medium">{audience.label}</div>
                            <div className="text-sm text-slate-600">{audience.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorScheme">Color Scheme</Label>
                  <Select name="colorScheme" defaultValue={selectedConfig?.colorScheme || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_SCHEMES.map((scheme) => (
                        <SelectItem key={scheme.value} value={scheme.value}>
                          {scheme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryTagline">Primary Tagline</Label>
                <Input
                  name="primaryTagline"
                  defaultValue={selectedConfig?.primaryTagline || ""}
                  placeholder="Main headline that captures your audience"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryTagline">Secondary Tagline (Optional)</Label>
                <Input
                  name="secondaryTagline"
                  defaultValue={selectedConfig?.secondaryTagline || ""}
                  placeholder="Supporting headline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problemStatement">Problem Statement</Label>
                <Textarea
                  name="problemStatement"
                  defaultValue={selectedConfig?.problemStatement || ""}
                  placeholder="What challenge does your audience face?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visionStatement">Vision Statement</Label>
                <Textarea
                  name="visionStatement"
                  defaultValue={selectedConfig?.visionStatement || ""}
                  placeholder="How does your platform solve this challenge?"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="mentorTerminology">Mentor Terminology</Label>
                  <Select name="mentorTerminology" defaultValue={selectedConfig?.mentorTerminology || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select terminology" />
                    </SelectTrigger>
                    <SelectContent>
                      {MENTOR_TERMINOLOGY.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Communication Tone</Label>
                  <Select name="tone" defaultValue={selectedConfig?.tone || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>
                          {tone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctaText">Call-to-Action Text</Label>
                  <Input
                    name="ctaText"
                    defaultValue={selectedConfig?.ctaText || ""}
                    placeholder="Enter Mentra"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="mentra-button" disabled={createMutation.isPending || updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedConfig(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}