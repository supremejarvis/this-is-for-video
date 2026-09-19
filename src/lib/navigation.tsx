'use client';

import React from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, href, children, ...rest }, ref) => {
    const target = (to || href || '#') as string;
    return (
      <NextLink ref={ref} href={target} {...rest}>
        {children}
      </NextLink>
    );
  }
);

Link.displayName = 'Link';

export function useNavigate() {
  let router: any = null;
  try {
    router = useRouter();
  } catch {
    // Fallback when rendered in testing-library / Vitest outside of App Router
  }

  return (path: string | number) => {
    if (typeof path === 'number') {
      if (typeof window !== 'undefined') {
        if (path === -1) window.history.back();
        else if (path === 1) window.history.forward();
      }
      return;
    }

    if (router && typeof router.push === 'function') {
      router.push(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };
}

export function useLocation() {
  let pathname = '/';
  let searchParams: any = null;
  try {
    pathname = usePathname() || '/';
    searchParams = useSearchParams();
  } catch {
    // Fallback when rendered in testing-library / Vitest outside of App Router
  }

  return {
    pathname: pathname || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    search: searchParams?.toString()
      ? `?${searchParams.toString()}`
      : typeof window !== 'undefined'
      ? window.location.search
      : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
  };
}

export { usePathname, useRouter, useSearchParams };
