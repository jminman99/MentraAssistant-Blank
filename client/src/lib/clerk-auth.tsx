import { ClerkProvider, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Get Clerk configuration with proper Vite environment variable access
const clerkPublishableKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.warn('Missing Clerk Publishable Key - using development fallback');
}

// Custom auth context that bridges Clerk with your app
interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: { mutateAsync: (data: any) => Promise<void>; isPending: boolean };
  logout: { mutateAsync: () => Promise<void>; isPending: boolean };
  register: { mutateAsync: (data: any) => Promise<void>; isPending: boolean };
}

const AuthContext = createContext<AuthContextType | null>(null);

// Development fallback provider when Clerk is not configured
function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: false,
    login: {
      mutateAsync: async () => {
        setIsLoading(true);
        window.location.href = '/sign-in';
        setIsLoading(false);
      },
      isPending: isLoading,
    },
    logout: {
      mutateAsync: async () => {
        setUser(null);
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

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth provider that wraps Clerk functionality
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // If no Clerk key is available, provide a development fallback
  if (!clerkPublishableKey) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </ClerkProvider>
  );
}

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerkAuth();
  const queryClient = useQueryClient();

  // Sync Clerk user with your backend
  const { data: backendUser, isLoading: isBackendLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      if (!clerkUser) return null;
      
      // Sync user data with your backend
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

  // Login mutation (redirects to Clerk)
  const loginMutation = useMutation({
    mutationFn: async () => {
      // Clerk handles login via redirects, so this just triggers the flow
      window.location.href = '/sign-in';
    },
  });

  // Register mutation (redirects to Clerk)
  const registerMutation = useMutation({
    mutationFn: async () => {
      // Clerk handles registration via redirects, so this just triggers the flow
      window.location.href = '/sign-up';
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
      queryClient.clear();
    },
  });

  const contextValue: AuthContextType = {
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

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}