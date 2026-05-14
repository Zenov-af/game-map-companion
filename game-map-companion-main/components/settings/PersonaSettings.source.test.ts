import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('PersonaSettings source contains expected logic', () => {
  const filePath = path.resolve('components/settings/PersonaSettings.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('data-testid="add-persona-button"'), 'Should have add button test id');
  assert.ok(content.includes('data-testid="system-prompt-textarea"'), 'Should have system prompt test id');
  assert.ok(content.includes('data-testid={`persona-item-${persona.id}`}'), 'Should have persona item test id');
  assert.ok(content.includes('onClick={addPersona}'), 'Should call addPersona');
  assert.ok(content.includes('onChange={(e) => setSystemPrompt(e.target.value)}'), 'Should call setSystemPrompt');
});
