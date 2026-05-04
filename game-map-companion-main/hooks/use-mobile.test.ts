import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
// @ts-ignore
import { renderHook } from 'react';
import { useIsMobile } from './use-mobile.ts';

// Mock window and matchMedia
const createMockMql = (matches: boolean) => {
  const listeners = new Set<() => void>();
  return {
    matches,
    addEventListener: (event: string, handler: () => void) => {
      if (event === 'change') listeners.add(handler);
    },
    removeEventListener: (event: string, handler: () => void) => {
      if (event === 'change') listeners.delete(handler);
    },
    // Test helper to trigger change
    __triggerChange: () => {
      listeners.forEach(handler => handler());
    },
    __listenerCount: () => listeners.size
  };
};

let mockMql: ReturnType<typeof createMockMql>;

beforeEach(() => {
  // @ts-ignore
  global.window = {
    innerWidth: 1024,
    matchMedia: (query: string) => {
      // Parse max-width from query like "(max-width: 767px)"
      const match = query.match(/\(max-width:\s*(\d+)px\)/);
      const maxWidth = match ? parseInt(match[1], 10) : 0;
      mockMql = createMockMql(window.innerWidth <= maxWidth);
      return mockMql;
    }
  };
});

test('useIsMobile returns false initially on desktop', () => {
  // @ts-ignore
  window.innerWidth = 1024;
  const { result, rerender } = renderHook(() => useIsMobile());
  // Initial render (before effect)
  assert.strictEqual(result.current, false);
  // After effect
  rerender();
  assert.strictEqual(result.current, false, 'Should be false on desktop (1024px)');
});

test('useIsMobile returns true on mobile after mount', () => {
  // @ts-ignore
  window.innerWidth = 500;
  const { result, rerender } = renderHook(() => useIsMobile());
  // After effect has run and we rerender
  rerender();
  assert.strictEqual(result.current, true, 'Should be true on mobile (500px)');
});

test('useIsMobile updates state on window resize/matchMedia change', () => {
  // Start as desktop
  // @ts-ignore
  window.innerWidth = 1024;
  const { result, rerender } = renderHook(() => useIsMobile());
  assert.strictEqual(result.current, false);

  // Change to mobile
  // @ts-ignore
  window.innerWidth = 500;
  mockMql.__triggerChange();
  // We need to rerender to get the new state in our simple mock
  rerender();
  assert.strictEqual(result.current, true);
});

test('useIsMobile cleans up event listener on unmount', () => {
  const { unmount } = renderHook(() => useIsMobile());
  assert.strictEqual(mockMql.__listenerCount(), 1);

  unmount();
  assert.strictEqual(mockMql.__listenerCount(), 0);
});
