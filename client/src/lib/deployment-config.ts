// Deployment configuration - detects environment and provides appropriate API client
import { vercelApiClient } from './api-client-vercel';

export interface DeploymentConfig {
  isVercel: boolean;
  isReplit: boolean;
  apiClient: any;
  chatComponent: string;
}

// Detect deployment environment safely - browser only
function getDeploymentEnvironment() {
  // Default to Vercel if no window (SSR context)
  if (typeof window === 'undefined') {
    return {
      isVercel: true,
      isReplit: false
    };
  }
  
  // Client-side detection using hostname only
  const hostname = window.location.hostname;
  const isVercel = hostname.includes('vercel.app');
  const isReplit = !isVercel && (
    hostname.includes('replit') || 
    hostname.includes('replit.dev')
  );
  
  return { isVercel, isReplit };
}

const { isVercel, isReplit } = getDeploymentEnvironment();

export const deploymentConfig: DeploymentConfig = {
  isVercel,
  isReplit,
  apiClient: isVercel ? vercelApiClient : null, // Use existing queryClient for Replit
  chatComponent: isVercel ? 'ChatInterfaceVercel' : 'ChatInterface'
};

export { deploymentConfig as default };