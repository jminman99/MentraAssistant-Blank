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
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          // Don't redirect if we're already on login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return null;
        }
        if (!res.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await res.json();
        return data.data || data.user || data;
      } catch (error) {
        console.error('Auth fetch error:', error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response.json();
    },
    onSuccess: (data) => {
      // Handle both direct user object and nested data structure
      console.log('Login success data:', data);
      const userData = data.data?.user || data.user || data;
      console.log('Extracted user data:', userData);
      queryClient.setQueryData(['/api/auth/me'], userData);
      // Force a refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (deploymentConfig.isVercel && deploymentConfig.apiClient) {
        await deploymentConfig.apiClient.logout();
      } else {
        await apiRequest('POST', '/api/auth/logout', {});
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
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
