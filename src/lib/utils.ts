import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class lists, resolving conflicts (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A cheap, dependency-free id for client-side objects (mock ids, keys). */
export function shortId(prefix = 'id'): string {
  const rand = Math.floor(performance.now() * 1000).toString(36);
  return `${prefix}_${rand}`;
}
