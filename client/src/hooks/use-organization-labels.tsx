import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-hook';
import { setOrganizationLabels, DefaultFeatureDisplayLabels, type LabelKey } from '@/lib/constants';
import { useEffect } from 'react';

// Helper function to get Clerk token
async function getClerkToken(getToken: any): Promise<string> {
  if (!getToken) throw new Error('No authentication available');

  let token: string | null = null;
  try {
    token = await getToken({ template: 'mentra-api' });
  } catch {
    try {
      token = await getToken({ template: 'default' });
    } catch {
      token = await getToken();
    }
  }

  if (!token) throw new Error('No Clerk token available');
  return token;
}

export interface OrganizationBranding {
  id: number;
  organizationId: number;
  featureLabels: Record<string, string>;
  navigationConfig: {
    items: Array<{
      key: string;
      route: string;
      icon: string;
      enabled: boolean;
      order: number;
    }>;
  };
  mentorTerminology: string;
  targetAudience: string;
  primaryTagline: string;
  tone: string;
}

// Hook to load and apply organization-specific UI labels
export function useOrganizationLabels() {
  const { user, isAuthenticated } = useAuth();

  // Fetch organization branding configuration
  const { data: branding, isLoading, error } = useQuery({
    queryKey: ['/api/branding', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) return null;

      const token = await getClerkToken(getToken);
      const response = await fetch(`/api/branding/${user.organizationId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No custom branding configuration found, use defaults
          return null;
        }
        throw new Error('Failed to fetch organization branding');
      }

      const result = await response.json();
      return result.data as OrganizationBranding;
    },
    enabled: Boolean(isAuthenticated && user?.organizationId && getToken),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Apply organization labels when branding data changes
  useEffect(() => {
    if (branding?.featureLabels) {
      setOrganizationLabels(branding.featureLabels);
    } else {
      // Reset to defaults if no custom labels
      setOrganizationLabels({});
    }
  }, [branding]);

  return {
    branding,
    isLoading,
    error,
    hasCustomLabels: Boolean(branding?.featureLabels && Object.keys(branding.featureLabels).length > 0),
    mentorTerminology: branding?.mentorTerminology || 'mentors',
  };
}

// Hook to get a specific label with organization override
export function useLabel(key: LabelKey): string {
  const { branding } = useOrganizationLabels();

  // Return organization-specific label if available, otherwise default
  return branding?.featureLabels?.[key] || DefaultFeatureDisplayLabels[key];
}

// Hook to get multiple labels at once
export function useLabels(keys: LabelKey[]): Record<LabelKey, string> {
  const { branding } = useOrganizationLabels();

  return keys.reduce((acc, key) => {
    acc[key] = branding?.featureLabels?.[key] || DefaultFeatureDisplayLabels[key];
    return acc;
  }, {} as Record<LabelKey, string>);
}