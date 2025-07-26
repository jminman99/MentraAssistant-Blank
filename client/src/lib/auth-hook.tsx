
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiRequest } from './queryClient';

// Type definitions
export interface BackendUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionPlan?: string;
  organizationId?: number;
}

export interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress?: { emailAddress: string };
  email?: string;
}

export function isBackendUser(u: BackendUser | ClerkUser | null): u is BackendUser {
  return !!(u as BackendUser)?.id && typeof (u as BackendUser).id === 'number' && typeof (u as any).email === 'string';
}

// Hook that works with both Clerk and development modes
export function useAuth() {
  // Use the same environment detection logic as main.tsx
  const clerkPublishableKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY;
  
  if (import.meta.env.DEV) {
    console.log('Auth hook - Clerk key available:', !!clerkPublishableKey);
  }
  
  if (clerkPublishableKey) {
    // Production mode with Clerk
    if (import.meta.env.DEV) {
      console.log('Using Clerk authentication');
    }
    return useClerkAuthentication();
  } else {
    // Development mode without Clerk
    if (import.meta.env.DEV) {
      console.log('Using development authentication');
    }
    return useDevAuthentication();
  }
}

// Clerk authentication hook with all improvements
function useClerkAuthentication() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut, getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  // Sync Clerk user with backend - user-scoped cache key
  const { data: backendUser, isLoading: isBackendLoading, error: syncError } = useQuery({
    queryKey: ['/api/auth/sync-clerk-user', clerkUser?.id],
    queryFn: async ({ signal }) => {
      if (!clerkUser) return null;
      
      try {
        const res = await apiRequest('/api/auth/sync-clerk-user', {
          method: 'POST',
          body: {
            clerkUserId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          },
          signal, // Abort on unmount
        }, () => getToken());
        
        if (!res.success) {
          throw new Error(res.error || 'Failed to sync user');
        }
        
        if (import.meta.env.DEV) {
          console.log('✅ User sync successful:', res.data);
        }
        
        return res.data;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ User sync failed:', error);
        }
        throw error;
      }
    },
    enabled: !!clerkUser && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Refresh helper
  const refresh = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/auth/sync-clerk-user', clerkUser?.id] 
    });
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/sign-in';
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (import.meta.env.DEV) {
        console.log('🚪 Starting Clerk sign out…');
      }
      await signOut({ redirectUrl: '/sign-in' });
      queryClient.clear();
      if (import.meta.env.DEV) {
        console.log('✅ Sign out completed');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/sign-up';
    },
  });

  // Determine user and backend readiness
  const user = backendUser || clerkUser;
  const backendReady = !!backendUser && !isBackendLoading;
  const isLoading = !isLoaded || isBackendLoading;
  const isAuthenticated = !!isSignedIn && !!clerkUser;

  // Stable return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // Core user data
    user,
    clerkUser,
    backendUser,
    
    // Convenience fields for components
    email: backendUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.email,
    displayName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
    subscriptionPlan: backendReady ? backendUser?.subscriptionPlan : null,
    
    // State flags
    isLoaded,
    isSignedIn,
    isLoading,
    isAuthenticated,
    backendReady,
    
    // Token access
    getToken,
    
    // Utilities
    refresh,
    syncError,
    
    // Mutation methods
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
  }), [
    user, clerkUser, backendUser, isLoaded, isSignedIn, isLoading, 
    isAuthenticated, backendReady, getToken, refresh, syncError,
    loginMutation.mutateAsync, loginMutation.isPending,
    logoutMutation.mutateAsync, logoutMutation.isPending,
    registerMutation.mutateAsync, registerMutation.isPending
  ]);
}

// Development authentication hook
function useDevAuthentication() {
  return useMemo(() => ({
    user: null,
    clerkUser: null,
    backendUser: null,
    email: null,
    displayName: null,
    subscriptionPlan: null,
    isLoaded: true,
    isSignedIn: false,
    isLoading: false,
    isAuthenticated: false,
    backendReady: false,
    getToken: () => Promise.resolve(null),
    refresh: () => {},
    syncError: null,
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
  }), []);
}
