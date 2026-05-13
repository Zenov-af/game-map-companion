import React, { RefObject } from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  imageData?: string;
}

interface ChatMessageListProps {
  messages?: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({ messages, isLoading, messagesEndRef }: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {messages?.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm italic">
          No messages yet. Start a conversation!
        </div>
      )}
      {messages?.map(msg => (
        <div key={msg.id} className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
          </div>
          <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-none shadow-sm'}`}>
            {msg.imageData && (
              <img src={msg.imageData} alt="Uploaded" className="max-w-full rounded-lg mb-2 max-h-64 object-contain" />
            )}
            {msg.text && (
              <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-3 max-w-[80%] self-start">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="p-3 rounded-2xl bg-white border border-neutral-200 text-neutral-800 rounded-tl-none shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
