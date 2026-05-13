'use client';

import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Send, Bot, User, Trash2, ImagePlus, X, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useChatApi } from '@/hooks/useChatApi';

export default function ChatComponent({ currentMapId, activeProfileId }: { currentMapId: string | null, activeProfileId: string }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isListening, autoSpeak, setAutoSpeak, toggleListening, speakText } = useSpeechRecognition(setInput);

  const messages = useLiveQuery(
    () => db.chatMessages.where('profileId').equals(activeProfileId).sortBy('timestamp'),
    [activeProfileId]
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMap = useLiveQuery(
    async () => {
      if (!currentMapId) return undefined;
      return await db.maps.get(currentMapId);
    },
    [currentMapId]
  );
  const currentDrawings = useLiveQuery(
    async () => {
      if (!currentMapId) return [];
      return await db.drawings.where('mapId').equals(currentMapId).toArray();
    },
    [currentMapId]
  );
  const currentMarkers = useLiveQuery(
    async () => {
      if (!currentMapId) return [];
      return await db.markers.where('mapId').equals(currentMapId).toArray();
    },
    [currentMapId]
  );
  const appSettings = useLiveQuery(
    async () => {
      return await db.settings.where('profileId').equals(activeProfileId).first();
    },
    [activeProfileId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { handleSend, clearChat, handlePersonaChange } = useChatApi({
    activeProfileId,
    appSettings,
    currentMap,
    currentMarkers,
    currentDrawings,
    messages,
    autoSpeak,
    speakText,
    setIsLoading,
    setInput,
    setSelectedImage,
    input,
    selectedImage,
    isLoading
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setSelectedImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="p-4 bg-white border-b border-neutral-200 shadow-sm flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              AI Assistant
            </h2>
            <button
              onClick={clearChat}
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
                onChange={handlePersonaChange}
              >
                <option value="default">Default Persona</option>
                {appSettings.personas.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

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

      <div className="p-4 bg-white border-t border-neutral-200">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-neutral-200 shadow-sm" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Upload Image"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-neutral-500 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Voice Dictation"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            type="text"
            className="flex-1 border border-neutral-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ask about your notes or maps..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12"
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
