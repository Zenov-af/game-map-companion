import { test } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { LLMSettings } from './LLMSettings.tsx';
import { renderToStaticMarkup } from 'react-dom/server';

test('LLMSettings renders HTML successfully', () => {
  const props = {
    aiProvider: 'gemini',
    setAiProvider: () => {},
    geminiApiKey: '',
    setGeminiApiKey: () => {},
    localAiEndpoint: '',
    setLocalAiEndpoint: () => {},
    localAiModel: '',
    setLocalAiModel: () => {},
    temperature: 0.7,
    setTemperature: () => {},
    maxTokens: 1000,
    setMaxTokens: () => {},
    includeMapContext: true,
    setIncludeMapContext: () => {},
    includeMarkersContext: true,
    setIncludeMarkersContext: () => {},
  };

  const element = React.createElement(LLMSettings, props);
  const html = renderToStaticMarkup(element);

  assert.ok(html.includes('AI Configuration'));
  assert.ok(html.includes('Advanced Parameters'));
  assert.ok(html.includes('Context Control'));
  assert.ok(html.includes('Google Gemini (Default)'));
});
