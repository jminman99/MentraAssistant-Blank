import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Hook that works with both Clerk and development modes
export function useAuth() {
  // Use the same environment detection logic as main.tsx
  const clerkPublishableKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY;
  
  console.log('Auth hook - Clerk key available:', !!clerkPublishableKey);
  
  if (clerkPublishableKey) {
    // Production mode with Clerk
    console.log('Using Clerk authentication');
    return useClerkAuthentication();
  } else {
    // Development mode without Clerk
    console.log('Using development authentication');
    return useDevAuthentication();
  }
}

// Clerk authentication hook
function useClerkAuthentication() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerkAuth();
  const queryClient = useQueryClient();

  // Sync Clerk user with backend
  const { data: backendUser, isLoading: isBackendLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      if (!clerkUser) return null;
      
      const response = await fetch('/api/auth/sync-clerk-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync user');
      }
      
      return response.json();
    },
    enabled: !!clerkUser && isSignedIn,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/sign-in';
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
      queryClient.clear();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/sign-up';
    },
  });

  return {
    user: backendUser?.data || clerkUser,
    isLoading: !isLoaded || isBackendLoading,
    isAuthenticated: Boolean(isSignedIn) && !!clerkUser,
    login: {
      mutateAsync: loginMutation.mutateAsync,
      isPending: loginMutation.isPending,
    },
    logout: {
      mutateAsync: logoutMutation.mutateAsync,
      isPending: logoutMutation.isPending,
    },
    register: {
      mutateAsync: registerMutation.mutateAsync,
      isPending: registerMutation.isPending,
    },
  };
}

// Development authentication hook
function useDevAuthentication() {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: {
      mutateAsync: async () => {
        window.location.href = '/sign-in';
      },
      isPending: false,
    },
    logout: {
      mutateAsync: async () => {
        // Nothing to do in dev mode
      },
      isPending: false,
    },
    register: {
      mutateAsync: async () => {
        window.location.href = '/sign-up';
      },
      isPending: false,
    },
  };
}