/**
 * Minimal className merge utility.
 * Replaces clsx + tailwind-merge with a simple implementation.
 */
export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}
