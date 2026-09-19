import type { Metadata } from 'next';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';

export const metadata: Metadata = {
  title: 'SuperAdmin Dashboard',
  description: 'Apollo Engineering Enterprise Management Portal',
};

export default function AdminRoute() {
  return <SuperAdminDashboard />;
}
