// Deployment configuration - disable Vercel-specific client for development
import { vercelApiClient } from './api-client-vercel';

export interface DeploymentConfig {
  isVercel: boolean;
  apiClient: any;
  chatComponent: string;
}

// Use Vercel configuration only in production
export const deploymentConfig: DeploymentConfig = {
  isVercel: false, // Set to false for now to use direct fetch
  apiClient: vercelApiClient,
  chatComponent: 'ChatInterfaceVercel'
};

export { deploymentConfig as default };