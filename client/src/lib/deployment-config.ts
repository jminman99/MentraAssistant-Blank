// Deployment configuration - detects environment and provides appropriate API client
import { vercelApiClient } from './api-client-vercel';

export interface DeploymentConfig {
  isVercel: boolean;
  isReplit: boolean;
  apiClient: any;
  chatComponent: string;
}

// Detect deployment environment
const isVercel = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) || 
                 (typeof import.meta !== 'undefined' && import.meta.env?.VERCEL === '1');
const isReplit = !isVercel && typeof window !== 'undefined' && (
  window.location.hostname.includes('replit') || 
  window.location.hostname.includes('replit.dev')
);

export const deploymentConfig: DeploymentConfig = {
  isVercel,
  isReplit,
  apiClient: isVercel ? vercelApiClient : null, // Use existing queryClient for Replit
  chatComponent: isVercel ? 'ChatInterfaceVercel' : 'ChatInterface'
};

export { deploymentConfig as default };