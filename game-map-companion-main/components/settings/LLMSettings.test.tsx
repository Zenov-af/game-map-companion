import '../../test-setup';
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { LLMSettings } from './LLMSettings';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(() => {
  cleanup();
});

const defaultProps = {
  aiProvider: 'gemini',
  setAiProvider: mock.fn(),
  geminiApiKey: '',
  setGeminiApiKey: mock.fn(),
  localAiEndpoint: '',
  setLocalAiEndpoint: mock.fn(),
  localAiModel: '',
  setLocalAiModel: mock.fn(),
  temperature: 0.7,
  setTemperature: mock.fn(),
  maxTokens: 1000,
  setMaxTokens: mock.fn(),
  includeMapContext: true,
  setIncludeMapContext: mock.fn(),
  includeMarkersContext: true,
  setIncludeMarkersContext: mock.fn(),
};

test('LLMSettings renders default Gemini layout correctly', () => {
  render(<LLMSettings {...defaultProps} />);

  assert.ok(screen.getByText('AI Configuration'));
  assert.ok(screen.getByText('Advanced Parameters'));
  assert.ok(screen.getByText('Context Control'));

  // Provider is Gemini
  const select = screen.getByRole('combobox');
  assert.strictEqual((select as HTMLSelectElement).value, 'gemini');

  // Gemini API Key input is present
  assert.ok(screen.getByPlaceholderText('Leave empty to use the built-in key if available'));

  // Local AI inputs should NOT be present
  assert.strictEqual(screen.queryByPlaceholderText('http://localhost:1234/v1/chat/completions'), null);
});

test('LLMSettings renders Local AI layout correctly', () => {
  render(<LLMSettings {...defaultProps} aiProvider="local" />);

  // Gemini API Key input should NOT be present
  assert.strictEqual(screen.queryByPlaceholderText('Leave empty to use the built-in key if available'), null);

  // Local AI inputs should be present
  assert.ok(screen.getByPlaceholderText('http://localhost:1234/v1/chat/completions'));
  assert.ok(screen.getByPlaceholderText('e.g. llama3, local-model'));
  assert.ok(screen.getByText(/Some local AI models do not natively support image inputs/));
});

test('LLMSettings calls setAiProvider on provider change', async () => {
  const setAiProvider = mock.fn();
  const user = userEvent.setup();
  render(<LLMSettings {...defaultProps} setAiProvider={setAiProvider} />);

  const select = screen.getByRole('combobox');
  await user.selectOptions(select, 'local');

  assert.strictEqual(setAiProvider.mock.calls.length, 1);
  assert.strictEqual(setAiProvider.mock.calls[0].arguments[0], 'local');
});

test('LLMSettings handles Gemini input correctly', async () => {
  const setGeminiApiKey = mock.fn();
  const user = userEvent.setup();
  render(<LLMSettings {...defaultProps} setGeminiApiKey={setGeminiApiKey} />);

  const input = screen.getByPlaceholderText('Leave empty to use the built-in key if available');
  await user.type(input, 'a');

  assert.strictEqual(setGeminiApiKey.mock.calls.length, 1);
  assert.strictEqual(setGeminiApiKey.mock.calls[0].arguments[0], 'a');
});

test('LLMSettings handles Local AI inputs correctly', async () => {
  const setLocalAiEndpoint = mock.fn();
  const setLocalAiModel = mock.fn();
  const user = userEvent.setup();
  render(
    <LLMSettings
      {...defaultProps}
      aiProvider="local"
      setLocalAiEndpoint={setLocalAiEndpoint}
      setLocalAiModel={setLocalAiModel}
    />
  );

  const endpointInput = screen.getByPlaceholderText('http://localhost:1234/v1/chat/completions');
  await user.type(endpointInput, 'x');
  assert.strictEqual(setLocalAiEndpoint.mock.calls.length, 1);
  assert.strictEqual(setLocalAiEndpoint.mock.calls[0].arguments[0], 'x');

  const modelInput = screen.getByPlaceholderText('e.g. llama3, local-model');
  await user.type(modelInput, 'y');
  assert.strictEqual(setLocalAiModel.mock.calls.length, 1);
  assert.strictEqual(setLocalAiModel.mock.calls[0].arguments[0], 'y');
});

test('LLMSettings handles advanced parameters correctly', async () => {
  const setTemperature = mock.fn();
  const setMaxTokens = mock.fn();
  const { container } = render(
    <LLMSettings
      {...defaultProps}
      temperature={0.5}
      setTemperature={setTemperature}
      maxTokens={100}
      setMaxTokens={setMaxTokens}
    />
  );

  const rangeInput = container.querySelector('input[type="range"]') as HTMLInputElement;
  fireEvent.change(rangeInput, { target: { value: '0.8' } });

  assert.strictEqual(setTemperature.mock.calls.length, 1);
  assert.strictEqual(setTemperature.mock.calls[0].arguments[0], 0.8);

  const tokensInput = screen.getByRole('spinbutton');
  fireEvent.change(tokensInput, { target: { value: '200' } });

  assert.ok(setMaxTokens.mock.calls.length >= 1);
  assert.strictEqual(setMaxTokens.mock.calls[setMaxTokens.mock.calls.length - 1].arguments[0], 200);
});

test('LLMSettings handles context controls correctly', async () => {
  const setIncludeMapContext = mock.fn();
  const setIncludeMarkersContext = mock.fn();
  const user = userEvent.setup();
  render(
    <LLMSettings
      {...defaultProps}
      includeMapContext={true}
      setIncludeMapContext={setIncludeMapContext}
      includeMarkersContext={false}
      setIncludeMarkersContext={setIncludeMarkersContext}
    />
  );

  // Find checkboxes by text using regex for exact match
  const mapCheckboxLabel = screen.getByText('Include Current Map Name & Layout Context');
  await user.click(mapCheckboxLabel);
  assert.strictEqual(setIncludeMapContext.mock.calls.length, 1);
  assert.strictEqual(setIncludeMapContext.mock.calls[0].arguments[0], false);

  const markersCheckboxLabel = screen.getByText('Include All Placed Markers & Notes');
  await user.click(markersCheckboxLabel);
  assert.strictEqual(setIncludeMarkersContext.mock.calls.length, 1);
  assert.strictEqual(setIncludeMarkersContext.mock.calls[0].arguments[0], true);
});
