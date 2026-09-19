import type { Metadata } from 'next';
import { ContactPage } from '@/components/pages/ContactPage';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Apollo Engineering for bulk orders, B2B inquiries, and support. Factory: Kathwada GIDC, Ahmedabad 382430.',
};

export default function ContactRoute() {
  return <ContactPage />;
}
