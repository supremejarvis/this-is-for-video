import type { Metadata } from 'next';
import { AboutPage } from '@/components/pages/AboutPage';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Apollo Engineering - SS304 solar cleaning hardware manufacturer at Kathwada GIDC, Ahmedabad.',
};

export default function AboutRoute() {
  return <AboutPage />;
}
