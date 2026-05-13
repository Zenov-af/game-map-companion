import { Bot, Trash2 } from 'lucide-react';
import React from 'react';

interface ChatHeaderProps {
  onClearChat: () => void;
  appSettings: any;
  onPersonaChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function ChatHeader({ onClearChat, appSettings, onPersonaChange }: ChatHeaderProps) {
  return (
    <div className="p-4 bg-white border-b border-neutral-200 shadow-sm flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            AI Assistant
          </h2>
          <button
            onClick={onClearChat}
            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-neutral-500 truncate">Ask questions about your maps & markers.</p>
          {appSettings?.personas && appSettings.personas.length > 0 && (
            <select
              className="text-xs bg-gray-100 border border-gray-200 rounded p-1 text-gray-700 outline-none max-w-[150px]"
              value={appSettings.activePersonaId || 'default'}
              onChange={onPersonaChange}
            >
              <option value="default">Default Persona</option>
              {appSettings.personas.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
