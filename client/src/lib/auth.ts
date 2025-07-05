import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { User } from "../types";
import { deploymentConfig } from "./deployment-config";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log("User not logged in!");
            // Don't redirect if we're already on login page
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return null;
          } else {
            const text = await response.text();
            console.error('Auth fetch failed:', text);
            return null;
          }
        }

        const json = await response.json();
        console.log('Auth response:', json);
        
        // Handle Vercel API response format {success: true, data: user}
        if (json.success && json.data) {
          return json.data;
        }
        
        // Handle legacy formats
        return json.user || json;
      } catch (error) {
        console.error('Auth fetch error:', error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Handle Vercel API response format {success: true, data: user}
      const userData = data.data;
      queryClient.setQueryData(['/api/auth/me'], userData);
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
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
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
