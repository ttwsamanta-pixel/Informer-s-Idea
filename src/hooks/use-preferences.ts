'use client';
import { useSyncExternalStore } from 'react';
export function readPreference(key: string, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private browsing can disable local storage. */
  }
  window.dispatchEvent(new Event('preferences-change'));
}
export function readList(key: string): string[] {
  try {
    const result = JSON.parse(readPreference(key, '[]'));
    return Array.isArray(result)
      ? result.filter((s) => typeof s === 'string')
      : [];
  } catch {
    return [];
  }
}
function subscribe(callback: () => void) {
  window.addEventListener('preferences-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('preferences-change', callback);
    window.removeEventListener('storage', callback);
  };
}
export function useStoredList(key: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readPreference(key, '[]'),
    () => '[]',
  );
  try {
    const result = JSON.parse(raw);
    return Array.isArray(result)
      ? result.filter((s: unknown): s is string => typeof s === 'string')
      : [];
  } catch {
    return [];
  }
}
