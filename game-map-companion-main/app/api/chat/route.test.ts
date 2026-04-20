import { test } from 'node:test';
import assert from 'node:assert';
import { POST } from './route.ts';

test('POST returns 500 when GEMINI_API_KEY is missing', async () => {
  // Save original API key
  const originalApiKey = process.env.GEMINI_API_KEY;
  // Ensure it's deleted
  delete process.env.GEMINI_API_KEY;

  try {
    // Mock NextRequest-like object
    const req = {
      json: async () => ({
        context: 'test context',
        history: [],
        userParts: [{ text: 'hello' }]
      })
    } as any;

    const response = await POST(req);
    const data = await response.json();

    assert.strictEqual(response.status, 500);
    assert.strictEqual(data.error, 'Gemini API key not configured on the server.');
  } finally {
    // Restore original API key if it existed
    if (originalApiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  }
});
