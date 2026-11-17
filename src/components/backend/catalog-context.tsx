'use client';
import { createContext, useContext } from 'react';
import { tools } from '@/config/tools';
import { categories } from '@/config/categories';
export type Catalog = {
  tools: typeof tools;
  categories: (typeof categories)[number][];
};
const CatalogContext = createContext<Catalog>({
  tools,
  categories: [...categories],
});
export const useCatalog = () => useContext(CatalogContext);
export function CatalogProvider({
  value,
  children,
}: {
  value: Catalog;
  children: React.ReactNode;
}) {
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
