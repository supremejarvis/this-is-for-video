import type { Metadata } from 'next';
import { InstallationPage } from '@/components/pages/InstallationPage';

export const metadata: Metadata = {
  title: 'Installation Guide',
  description: 'Step-by-step installation guide for Apollo Engineering solar panel cleaning sprinklers and drain clips.',
};

export default function InstallationRoute() {
  return <InstallationPage />;
}
