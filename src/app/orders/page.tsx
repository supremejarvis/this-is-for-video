import type { Metadata } from 'next';
import { LiveOrderTracker } from '@/components/logistics/LiveOrderTracker';

export const metadata: Metadata = {
  title: 'Track Orders',
  description: 'Track your Apollo Engineering orders with real-time Speed Post tracking.',
};

export default function OrdersRoute() {
  return <LiveOrderTracker />;
}
