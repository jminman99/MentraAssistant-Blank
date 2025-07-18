import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { User } from "../types";
// Deployment config import removed - no longer needed
import { 
  isRealApiAvailable, 
  DevAuthService, 
  MOCK_USER, 
  DEV_MODE 
} from "./mock-auth-dev";

export function useAuth() {
  const queryClient = useQueryClient();
  const devAuth = DevAuthService.getInstance();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: "include",
        });
        
        if (!res.ok) {
          // In development, fallback to mock authentication
          if (DEV_MODE) {
            const mockResult = await devAuth.getCurrentUser();
            return mockResult;
          }
          
          return null;
        }
        
        const data = await res.json();
        
        // Ensure we always return a consistent structure
        if (data && typeof data === 'object') {
          return data;
        } else {
          return null;
        }
      } catch (error) {
        // In development, fallback to mock authentication
        if (DEV_MODE) {
          const mockResult = await devAuth.getCurrentUser();
          return mockResult;
        }
        
        return null;
      }
    },
    retry: false, // Don't retry in development mode
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user = data?.data || null;

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string }) => {
      return fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include"
      }).then((res) => res.json());
    },
    onSuccess: (data) => {
      // Handle both real API and mock responses
      const userData = data.data || data;
      queryClient.setQueryData(['/api/auth/me'], { success: true, data: userData });
      queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Logout failed');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
      window.location.href = '/login';
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      firstName: string;
      lastName: string;
      subscriptionPlan?: string;
    }) => {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      return response.json();
    },
    onSuccess: (data) => {
      // Handle both direct user object and nested data structure
      const userData = data.data?.user || data.user || data;
      queryClient.setQueryData(['/api/auth/me'], userData);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation,
    logout: logoutMutation,
    register: registerMutation,
  };
}
