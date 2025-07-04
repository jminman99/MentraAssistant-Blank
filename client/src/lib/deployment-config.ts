// Deployment configuration - detects environment and provides appropriate API client
import { vercelApiClient } from './api-client-vercel';

export interface DeploymentConfig {
  isVercel: boolean;
  isReplit: boolean;
  apiClient: any;
  chatComponent: string;
}

// Detect deployment environment
const isVercel = process.env.VERCEL === '1' || window.location.hostname.includes('vercel.app');
const isReplit = !isVercel && (
  window.location.hostname.includes('replit') || 
  window.location.hostname.includes('replit.dev') ||
  process.env.REPLIT === '1'
);

export const deploymentConfig: DeploymentConfig = {
  isVercel,
  isReplit,
  apiClient: isVercel ? vercelApiClient : null, // Use existing queryClient for Replit
  chatComponent: isVercel ? 'ChatInterfaceVercel' : 'ChatInterface'
};

export { deploymentConfig as default };