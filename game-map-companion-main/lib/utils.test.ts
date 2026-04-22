import { test } from 'node:test';
import assert from 'node:assert';
import { cn } from './utils.ts';

test('cn merges classes correctly', () => {
  assert.strictEqual(cn('px-2', 'py-2'), 'px-2 py-2');
});

test('cn handles conditional classes', () => {
  assert.strictEqual(cn('px-2', true && 'py-2', false && 'm-2'), 'px-2 py-2');
});

test('cn handles arrays of classes', () => {
  assert.strictEqual(cn(['px-2', 'py-2'], 'm-2'), 'px-2 py-2 m-2');
});

test('cn handles objects of classes', () => {
  assert.strictEqual(cn({ 'px-2': true, 'py-2': false }, 'm-2'), 'px-2 m-2');
});

test('cn merges tailwind classes correctly (via mock twMerge logic)', () => {
  // Our simple mock treats the prefix as everything before the last hyphen.
  // 'px-2' and 'px-4' share 'px', so the latter should win.
  assert.strictEqual(cn('px-2', 'px-4'), 'px-4');

  // 'p-4' and 'p-2' share 'p'
  assert.strictEqual(cn('p-2', 'p-4'), 'p-4');
});

test('cn handles empty or nullish inputs', () => {
  assert.strictEqual(cn('', null, undefined as any, false as any), '');
});
