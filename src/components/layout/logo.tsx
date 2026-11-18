'use client';
import { useBranding } from '@/components/backend/branding-context';
import Link from 'next/link';
export function Logo() {
  const branding = useBranding();
  return (
    <Link
      href="/"
      className="brand"
      aria-label={`${branding.siteTitle || "Informer's Idea"} home`}
    >
      {branding.logo ? (
        <img
          src={branding.logo}
          alt={branding.siteTitle || "Informer's Idea"}
          style={{
            width: 'auto',
            maxWidth: 210,
            height: 48,
            objectFit: 'contain',
          }}
        />
      ) : (
        <img src="/logo/icon.svg" width="40" height="48" alt="" />
      )}
      {!branding.logo && (
        <span>
          <strong>
            {branding.siteTitle && branding.siteTitle !== "Informer's Idea" ? (
              branding.siteTitle
            ) : (
              <>
                Informer’s <em>Idea</em>
              </>
            )}
          </strong>
          <small>{branding.tagline || 'Smart Tools for a Smarter You'}</small>
        </span>
      )}
    </Link>
  );
}
