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

test('POST returns generic error message on unexpected failure', async () => {
  // Mock NextRequest-like object that will throw when .json() is called
  const req = {
    json: async () => {
      throw new Error('Database connection failed or some other sensitive info');
    }
  } as any;

  const response = await POST(req);
  const data = await response.json();

  assert.strictEqual(response.status, 500);
  assert.strictEqual(data.error, 'Failed to generate response from AI.');
  assert.notStrictEqual(data.error, 'Database connection failed or some other sensitive info');
});

test('POST returns 400 on invalid context', async () => {
  const req = {
    json: async () => ({
      context: '',
      history: [],
      userParts: [{ text: 'hello' }]
    })
  } as any;
  const response = await POST(req);
  const data = await response.json();
  assert.strictEqual(response.status, 400);
  assert.match(data.error, /Invalid context/);
});

test('POST returns 400 on invalid history', async () => {
  const req = {
    json: async () => ({
      context: 'test context',
      history: 'not an array',
      userParts: [{ text: 'hello' }]
    })
  } as any;
  const response = await POST(req);
  const data = await response.json();
  assert.strictEqual(response.status, 400);
  assert.match(data.error, /Invalid history/);
});

test('POST returns 400 on invalid history item', async () => {
  const req = {
    json: async () => ({
      context: 'test context',
      history: [{ role: 'invalid', parts: [] }],
      userParts: [{ text: 'hello' }]
    })
  } as any;
  const response = await POST(req);
  const data = await response.json();
  assert.strictEqual(response.status, 400);
  assert.match(data.error, /Invalid history item/);
});

test('POST returns 400 on invalid userParts', async () => {
  const req = {
    json: async () => ({
      context: 'test context',
      history: [],
      userParts: []
    })
  } as any;
  const response = await POST(req);
  const data = await response.json();
  assert.strictEqual(response.status, 400);
  assert.match(data.error, /Invalid userParts/);
});

test('POST returns 400 on invalid temperature', async () => {
  const req = {
    json: async () => ({
      context: 'test context',
      history: [],
      userParts: [{ text: 'hello' }],
      temperature: 2.5
    })
  } as any;
  const response = await POST(req);
  const data = await response.json();
  assert.strictEqual(response.status, 400);
  assert.match(data.error, /Invalid temperature/);
});

test('POST returns 400 on invalid maxTokens', async () => {
  const req = {
    json: async () => ({
      context: 'test context',
      history: [],
      userParts: [{ text: 'hello' }],
      maxTokens: 5000
    })
  } as any;
  const response = await POST(req);
  const data = await response.json();
  assert.strictEqual(response.status, 400);
  assert.match(data.error, /Invalid maxTokens/);
});
