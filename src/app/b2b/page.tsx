import type { Metadata } from 'next';
import { B2BPortal } from '@/components/b2b/B2BPortal';

export const metadata: Metadata = {
  title: 'B2B Wholesale Portal',
  description: 'Apollo Engineering B2B portal for bulk orders, GSTIN verification, and wholesale pricing on SS304 hardware.',
};

export default function B2BRoute() {
  return <B2BPortal />;
}
