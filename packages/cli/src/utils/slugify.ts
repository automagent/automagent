import { NAME_MAX_LENGTH } from '@automagent/schema';

/**
 * Convert a string to a valid agent name slug.
 * Matches schema pattern: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
 * Enforces maxLength from schema.
 */
export function slugify(s: string): string {
  let slug = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (slug.length > NAME_MAX_LENGTH) {
    slug = slug.slice(0, NAME_MAX_LENGTH).replace(/-$/, '');
  }
  return slug || 'imported-agent';
}
