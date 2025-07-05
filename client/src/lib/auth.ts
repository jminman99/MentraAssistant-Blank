import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { User } from "../types";
import { deploymentConfig } from "./deployment-config";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        console.log("useAuth - Fetching current user with credentials");
        const res = await fetch('/api/auth/me', {
          credentials: "include",
        });
        
        console.log("useAuth - Response status:", res.status);
        console.log("useAuth - Response ok:", res.ok);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.log("useAuth - Error response body:", errorText);
          return null;
        }
        
        const data = await res.json();
        console.log("useAuth - Success response:", data);
        return data;
      } catch (error) {
        console.error("useAuth - Fetch error:", error);
        return null;
      }
    },
    retry: false,
  });

  const user = data?.data || null;

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
