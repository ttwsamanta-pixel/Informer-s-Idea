'use client';
import { createContext, useContext } from 'react';
export type Branding = {
  siteTitle?: string;
  logo?: string;
  tagline?: string;
  youtube?: string;
  youtubeBangla?: string;
};
const Context = createContext<Branding>({});
export const BrandingProvider = Context.Provider;
export const useBranding = () => useContext(Context);
