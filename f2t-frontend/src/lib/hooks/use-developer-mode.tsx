import {
  getMockConsumerUser,
  getMockFarmData,
  getMockFarmUser,
  getMockToken,
} from '@/lib/dev-utils';
import { Env } from '@/lib/env';

/**
 * Hook to manage developer mode and bypass logic for testing
 */
export function useDeveloperMode() {
  const isDevelopment = Env.APP_ENV === 'development';
  const bypassLogin = Env.BYPASS_LOGIN === true;
  const shouldBypassLogin = isDevelopment && bypassLogin;

  return {
    isDevelopment,
    bypassLogin,
    shouldBypassLogin,
    getMockConsumerUser,
    getMockFarmUser,
    getMockFarmData,
    getMockToken,
  };
}
