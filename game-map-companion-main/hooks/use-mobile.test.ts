import { JSDOM } from "jsdom";
const jsdom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
const { window } = jsdom;
// @ts-ignore
const origWindow = global.window;
// @ts-ignore
global.window = window;
// @ts-ignore
global.document = window.document;

import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { renderHook, act } from '@testing-library/react';
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
  global.window.innerWidth = 1024;
  // @ts-ignore
  global.window.matchMedia = (query: string) => {
    // Parse max-width from query like "(max-width: 767px)"
    const match = query.match(/\(max-width:\s*(\d+)px\)/);
    const maxWidth = match ? parseInt(match[1], 10) : 0;
    // @ts-ignore
    mockMql = createMockMql(global.window.innerWidth <= maxWidth);
    return mockMql;
  };
});

test('useIsMobile returns false initially on desktop', () => {
  // @ts-ignore
  global.window.innerWidth = 1024;
  const { result } = renderHook(() => useIsMobile());
  assert.strictEqual(result.current, false, 'Should be false on desktop (1024px)');
});

test('useIsMobile returns true on mobile after mount', () => {
  // @ts-ignore
  global.window.innerWidth = 500;
  const { result } = renderHook(() => useIsMobile());
  // Because the hook does checking inside a useEffect,
  // it might be initially false on first render, then true
  assert.strictEqual(result.current, true, 'Should be true on mobile (500px)');
});

test('useIsMobile updates state on window resize/matchMedia change', () => {
  // Start as desktop
  // @ts-ignore
  global.window.innerWidth = 1024;
  const { result } = renderHook(() => useIsMobile());
  assert.strictEqual(result.current, false);

  // Change to mobile
  act(() => {
    // @ts-ignore
    global.window.innerWidth = 500;
    mockMql.matches = true;
    mockMql.__triggerChange();
  });

  assert.strictEqual(result.current, true);
});

test('useIsMobile cleans up event listener on unmount', () => {
  const { unmount } = renderHook(() => useIsMobile());
  assert.strictEqual(mockMql.__listenerCount(), 1);

  unmount();
  assert.strictEqual(mockMql.__listenerCount(), 0);
});
