import { describe, it, expect } from 'vitest';
import { slugify } from '../../utils/slugify.js';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles multiple words with spaces', () => {
    expect(slugify('My Research Bot')).toBe('my-research-bot');
  });

  it('lowercases uppercase strings', () => {
    expect(slugify('UPPERCASE')).toBe('uppercase');
  });

  it('collapses multiple dashes into one', () => {
    expect(slugify('with---multiple---dashes')).toBe('with-multiple-dashes');
  });

  it('trims leading and trailing spaces', () => {
    expect(slugify('  leading spaces  ')).toBe('leading-spaces');
  });

  it('replaces special characters with dashes', () => {
    expect(slugify('special!@#chars')).toBe('special-chars');
  });

  it('returns imported-agent for empty string', () => {
    expect(slugify('')).toBe('imported-agent');
  });

  it('returns imported-agent for only dashes', () => {
    expect(slugify('---')).toBe('imported-agent');
  });

  it('returns imported-agent for only special characters', () => {
    expect(slugify('!@#$%')).toBe('imported-agent');
  });

  it('handles single character', () => {
    expect(slugify('A')).toBe('a');
  });

  it('preserves string at max length (128 chars)', () => {
    const input = 'a'.repeat(128);
    expect(slugify(input)).toBe('a'.repeat(128));
  });

  it('truncates string over max length with no trailing dash', () => {
    const input = 'a'.repeat(200);
    const result = slugify(input);
    expect(result.length).toBeLessThanOrEqual(128);
    expect(result.endsWith('-')).toBe(false);
  });
});
