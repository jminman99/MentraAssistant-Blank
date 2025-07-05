// Vercel-only deployment configuration
import { vercelApiClient } from './api-client-vercel';

export interface DeploymentConfig {
  isVercel: boolean;
  apiClient: any;
  chatComponent: string;
}

// Always use Vercel configuration
export const deploymentConfig: DeploymentConfig = {
  isVercel: true,
  apiClient: vercelApiClient,
  chatComponent: 'ChatInterfaceVercel'
};

export { deploymentConfig as default };