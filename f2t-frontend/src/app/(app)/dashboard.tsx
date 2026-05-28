import React from 'react';

import { FarmRouteGuard } from '@/components/auth';
import { FarmDashboard } from '@/components/dashboard';

export default function DashboardScreen() {
  return (
    <FarmRouteGuard>
      <FarmDashboard />
    </FarmRouteGuard>
  );
}
