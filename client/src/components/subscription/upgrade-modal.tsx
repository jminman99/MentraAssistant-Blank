import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

interface UpgradeModalProps {
  currentPlan: string;
  onClose: () => void;
}

export function UpgradeModal({ currentPlan, onClose }: UpgradeModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest('POST', '/api/subscription/upgrade', { plan });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
      toast({
        title: "Plan Updated!",
        description: "Your subscription plan has been updated successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const plans = [
    {
      id: 'ai-only',
      name: 'AI-Only',
      price: 19,
      features: [
        '100 AI messages/month',
        '5 AI mentor personalities',
        '24/7 availability',
        'No human sessions'
      ],
      recommended: false,
    },
    {
      id: 'individual',
      name: 'Individual',
      price: 50,
      features: [
        '200 AI messages/month',
        '5 AI mentor personalities',
        '2 experienced guide sessions',
        'Video & in-person options'
      ],
      recommended: true,
    },
    {
      id: 'council',
      name: 'Council',
      price: 50,
      features: [
        '150 AI messages/month',
        '5 AI mentor personalities',
        '1 council session (3 mentors)',
        'Diverse perspectives'
      ],
      recommended: false,
    },
  ];

  const handleUpgrade = (planId: string) => {
    if (planId === currentPlan) {
      onClose();
      return;
    }
    upgradeMutation.mutate(planId);
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Choose Your Plan
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative border rounded-xl p-6 ${
                plan.recommended
                  ? 'border-2 border-primary'
                  : 'border border-slate-200'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white">Most Popular</Badge>
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <div className="text-3xl font-bold text-slate-900 mt-2">
                  ${plan.price}
                  <span className="text-lg text-slate-600">/month</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Check className="text-green-500 h-4 w-4 mr-2 flex-shrink-0" />
                    <span className={feature.includes('No ') ? 'text-slate-400' : 'text-slate-700'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={upgradeMutation.isPending}
                className={`w-full ${
                  currentPlan === plan.id
                    ? 'bg-slate-100 text-slate-600 cursor-default'
                    : plan.recommended
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
                variant={currentPlan === plan.id ? "outline" : "default"}
              >
                {currentPlan === plan.id
                  ? 'Current Plan'
                  : upgradeMutation.isPending
                  ? 'Updating...'
                  : `Switch to ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
