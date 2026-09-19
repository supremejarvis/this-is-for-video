import type { Metadata } from 'next';
import { WishlistPage } from '@/components/pages/WishlistPage';

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'Your saved products from Apollo Engineering. Move items to cart when ready to purchase.',
};

export default function WishlistRoute() {
  return <WishlistPage />;
}
