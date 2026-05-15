import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ChatComponent from './ChatComponent';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

// Setup Vitest mocks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((querier: any) => {
    try {
      const result = querier();
      if (result instanceof Promise) return [];
      return result;
    } catch (e) {
      return [];
    }
  })
}));

const mockChatMessagesAdd = vi.fn(async () => {});
const mockChatMessagesWhereEqualsDelete = vi.fn(async () => {});
const mockChatMessagesWhereEqualsSortBy = vi.fn(() => []);
const mockChatMessagesWhereEquals = vi.fn(() => ({
  sortBy: mockChatMessagesWhereEqualsSortBy,
  delete: mockChatMessagesWhereEqualsDelete,
}));
const mockChatMessagesWhere = vi.fn(() => ({
  equals: mockChatMessagesWhereEquals
}));

vi.mock('@/lib/db', () => {
  return {
    db: {
      chatMessages: {
        where: (...args: any[]) => mockChatMessagesWhere(...args),
        add: (...args: any[]) => mockChatMessagesAdd(...args),
      },
      maps: {
        get: vi.fn(async () => undefined),
      },
      drawings: {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            toArray: vi.fn(async () => []),
          }))
        })),
      },
      markers: {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            toArray: vi.fn(async () => []),
          }))
        })),
      },
      settings: {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            first: vi.fn(async () => undefined),
          }))
        })),
        put: vi.fn(async () => {}),
      }
    }
  };
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: vi.fn(async () => ({ text: 'Mocked AI response' })) }
  }
}));

vi.mock('react-markdown', () => ({
  default: function MockReactMarkdown({ children }: any) {
    return <div data-testid="markdown">{children}</div>;
  }
}));

vi.mock('remark-gfm', () => ({
  default: () => {}
}));

vi.mock('lucide-react', () => {
  const mockIcon = (name: string) => {
    const MockIconComponent = () => <span data-testid={`icon-${name}`}>{name}</span>;
    MockIconComponent.displayName = `MockIcon(${name})`;
    return MockIconComponent;
  };
  return {
    Send: mockIcon('send'),
    Bot: mockIcon('bot'),
    User: mockIcon('user'),
    Trash2: mockIcon('trash'),
    ImagePlus: mockIcon('image'),
    X: mockIcon('x'),
    Mic: mockIcon('mic'),
    MicOff: mockIcon('micoff'),
  };
});

describe('ChatComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global fetch for proxy calls
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ text: 'Mocked API response' })
    })) as any;

    // Setup window mocks
    global.window.SpeechRecognition = vi.fn();
    global.window.webkitSpeechRecognition = vi.fn();
    global.window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
    } as any;

    if (global.window.HTMLElement) {
      global.window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders default empty state', () => {
    (useLiveQuery as any).mockImplementation(() => []);

    render(<ChatComponent currentMapId={null} activeProfileId="profile1" />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask about your notes or maps...')).toBeInTheDocument();
  });

  test('renders previous chat messages', () => {
    (useLiveQuery as any).mockImplementation((querier: any) => {
      if (querier && querier.toString().includes('chatMessages')) {
        return [
          { id: '1', profileId: 'profile1', role: 'user', text: 'Hello AI', timestamp: 1000 },
          { id: '2', profileId: 'profile1', role: 'model', text: 'Hello User', timestamp: 2000 }
        ];
      }
      return [];
    });

    render(<ChatComponent currentMapId={null} activeProfileId="profile1" />);

    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    expect(screen.getByText('Hello User')).toBeInTheDocument();
  });

  test('sends a message and triggers loading state', async () => {
    const user = userEvent.setup();
    (useLiveQuery as any).mockImplementation(() => []);

    render(<ChatComponent currentMapId={null} activeProfileId="profile1" />);

    const input = screen.getByPlaceholderText('Ask about your notes or maps...');
    const sendButton = screen.getAllByTestId('icon-send')[0].parentElement;

    expect(sendButton).toBeTruthy();

    await user.type(input, 'Testing message');
    await user.click(sendButton!);

    expect((input as HTMLInputElement).value).toBe('');

    await waitFor(() => {
      expect(mockChatMessagesAdd).toHaveBeenCalled();
    });

    const addedMessage = mockChatMessagesAdd.mock.calls[0][0];
    expect(addedMessage.text).toBe('Testing message');
    expect(addedMessage.role).toBe('user');
  });

  test('clears chat history', async () => {
    const user = userEvent.setup();

    (useLiveQuery as any).mockImplementation((querier: any) => {
      if (querier && querier.toString().includes('chatMessages')) {
        return [{ id: '1', profileId: 'profile1', role: 'user', text: 'Hello AI', timestamp: 1000 }];
      }
      return [];
    });

    render(<ChatComponent currentMapId={null} activeProfileId="profile1" />);

    const clearButton = screen.getAllByTestId('icon-trash')[0].parentElement;
    expect(clearButton).toBeTruthy();

    await user.click(clearButton!);

    expect(mockChatMessagesWhere).toHaveBeenCalledWith('profileId');
    expect(mockChatMessagesWhereEquals).toHaveBeenCalledWith('profile1');
    expect(mockChatMessagesWhereEqualsDelete).toHaveBeenCalled();
  });

  test('toggles voice listening', async () => {
    const user = userEvent.setup();
    (useLiveQuery as any).mockImplementation(() => []);

    const mockStart = vi.fn();
    const mockStop = vi.fn();

    (global.window as any).SpeechRecognition = class {
      start = mockStart;
      stop = mockStop;
      continuous = false;
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
    };
    (global.window as any).webkitSpeechRecognition = (global.window as any).SpeechRecognition;

    render(<ChatComponent currentMapId={null} activeProfileId="profile1" />);

    const micButton = screen.getAllByTestId('icon-mic')[0].parentElement;
    expect(micButton).toBeTruthy();

    await user.click(micButton!);

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });
  });
});
