import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup global mocks
let alertMessages: string[] = [];
let errorLogs: string[] = [];

global.window = {
  alert: (msg: string) => { alertMessages.push(msg); },
  location: { reload: () => {} }
} as any;

global.alert = global.window.alert;

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('MODULE_TYPELESS_PACKAGE_JSON')) return;
  errorLogs.push(args[0]);
};

class MockFileReader {
  onload: ((event: any) => void) | null = null;
  readAsText(file: any) {
    if (this.onload) {
      this.onload({ target: { result: 'invalid json content' } });
    }
  }
}
global.FileReader = MockFileReader as any;

beforeEach(() => {
  alertMessages = [];
  errorLogs = [];
});

test('SettingsModal handles JSON parsing failure in handleImport', async () => {
  // We use this string evaluation approach because attempting to render the component directly
  // via react/jsx parsing fails in the basic `node --test` runner environment without a bundler,
  // and installing JSDOM + testing-library + vitest introduces heavy breaking changes
  // to the NextJS build configuration and environment.

  const sourceCode = fs.readFileSync(path.join(__dirname, 'SettingsModal.tsx'), 'utf-8');

  // Extract handleImport function body using regex
  const handleImportMatch = sourceCode.match(/const handleImport = async \(\w+: React.ChangeEvent<HTMLInputElement>\) => {([\s\S]*?)};\n\n  return/);

  if (!handleImportMatch) {
    throw new Error('Could not find handleImport function in SettingsModal.tsx');
  }

  let fnBody = handleImportMatch[1];
  fnBody = fnBody.replace(/as string/g, '');

  const mockEvent = {
    target: {
      files: [{ name: 'test.json' }]
    }
  };

  const execBody = `
    const e = arguments[0];
    const db = arguments[1];
    ${fnBody}
  `;

  const handleImport = new Function(execBody);

  await handleImport(mockEvent, {});

  await new Promise(resolve => setTimeout(resolve, 10));

  assert.strictEqual(alertMessages.length, 1);
  assert.strictEqual(alertMessages[0], 'Failed to import data. Invalid format.');
  assert.strictEqual(errorLogs.length, 1);
  assert.ok(errorLogs[0] instanceof SyntaxError, 'Expected a SyntaxError from JSON.parse');
});
