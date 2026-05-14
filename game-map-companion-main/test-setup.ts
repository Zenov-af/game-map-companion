import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost'
});
global.window = dom.window as any;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'node.js',
  },
});
