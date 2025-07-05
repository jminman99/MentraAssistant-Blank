import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Mentra</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-slate-600">
            You now have access to all of Mentra's mentorship features:
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>AI Mentors - Chat with wise guides anytime</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Individual Sessions - Book 1-on-1 mentoring</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Council Sessions - Group mentoring with multiple guides</span>
            </div>
          </div>
          
          <Button onClick={onClose} className="w-full">
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}