
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorFallback({ 
  title = "Something went wrong",
  description = "We encountered an error while loading this content.",
  onRetry,
  retryLabel = "Try again"
}: ErrorFallbackProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="text-center">
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
