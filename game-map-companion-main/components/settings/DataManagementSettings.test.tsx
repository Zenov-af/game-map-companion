import { test, afterEach } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DataManagementSettings } from './DataManagementSettings.tsx';
import { JSDOM } from 'jsdom';

// Setup JSDOM
const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost'
});
const { window } = jsdom;

// Setup global DOM environment for @testing-library/react
// @ts-ignore
global.window = window;
// @ts-ignore
global.document = window.document;

afterEach(() => {
  cleanup();
});

test('DataManagementSettings renders correctly', () => {
  const handleExport = () => {};
  const handleImport = () => {};

  const { getByText } = render(<DataManagementSettings handleExport={handleExport} handleImport={handleImport} />);

  assert.ok(getByText('Data Management'));
  assert.ok(getByText('Export Data (JSON)'));
  assert.ok(getByText('Import Data'));
});

test('DataManagementSettings calls handleExport when export button is clicked', () => {
  let exportClicked = false;
  const handleExport = () => {
    exportClicked = true;
  };
  const handleImport = () => {};

  const { getByText } = render(<DataManagementSettings handleExport={handleExport} handleImport={handleImport} />);

  fireEvent.click(getByText('Export Data (JSON)'));
  assert.strictEqual(exportClicked, true);
});

test('DataManagementSettings calls handleImport when a file is selected', () => {
  let importEvent: any = null;
  const handleExport = () => {};
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    importEvent = e;
  };

  const { container } = render(<DataManagementSettings handleExport={handleExport} handleImport={handleImport} />);

  const input = container.querySelector('input[type="file"]') as HTMLInputElement;

  // Create a mock file
  const file = new window.File(['dummy content'], 'test.json', { type: 'application/json' });

  // More idiomatic way for testing-library to simulate file upload
  fireEvent.change(input, { target: { files: [file] } });

  assert.ok(importEvent !== null);
  assert.ok(importEvent.target.files.length > 0);
  assert.strictEqual(importEvent.target.files[0].name, 'test.json');
});
