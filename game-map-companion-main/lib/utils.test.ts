import { test, expect } from 'vitest';
import { cn } from './utils.ts';

test('cn merges classes correctly', () => {
  expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
});

test('cn handles conditional classes', () => {
  expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2');
});

test('cn handles arrays of classes', () => {
  expect(cn(['px-2', 'py-2'], 'm-2')).toBe('px-2 py-2 m-2');
});

test('cn handles objects of classes', () => {
  expect(cn({ 'px-2': true, 'py-2': false }, 'm-2')).toBe('px-2 m-2');
});

test('cn merges tailwind classes correctly (via mock twMerge logic)', () => {
  // Our simple mock treats the prefix as everything before the last hyphen.
  // 'px-2' and 'px-4' share 'px', so the latter should win.
  expect(cn('px-2', 'px-4')).toBe('px-4');

  // 'p-4' and 'p-2' share 'p'
  expect(cn('p-2', 'p-4')).toBe('p-4');
});

test('cn handles empty or nullish inputs', () => {
  expect(cn('', null, undefined as any, false as any)).toBe('');
});
