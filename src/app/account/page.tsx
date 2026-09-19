import type { Metadata } from 'next';
import { CustomerAccountPage } from '@/components/pages/CustomerAccountPage';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your Apollo Engineering account, orders, addresses, and preferences.',
};

export default function AccountRoute() {
  return <CustomerAccountPage />;
}
