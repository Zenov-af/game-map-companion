'use client';

import { useState, useEffect, useRef } from 'react';
import { db, Marker } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { Send, Bot, User, Trash2, ImagePlus, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function ChatComponent({ currentMapId, activeProfileId }: { currentMapId: string | null, activeProfileId: string }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input.trim();
    const imageData = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const userMessage = {
      id: uuidv4(),
      profileId: activeProfileId,
      role: 'user' as const,
      text: userText,
      imageData: imageData || undefined,
      timestamp: Date.now(),
    };
    await db.chatMessages.add(userMessage);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      let context = 'You are a helpful AI assistant for a game map companion app.\n';
      if (appSettings?.systemPrompt) {
        context += `\nSystem Instructions:\n${appSettings.systemPrompt}\n\n`;
      }
      if (currentMap) {
        context += `The user is currently looking at a map named "${currentMap.name}".\n`;
        if (currentMarkers && currentMarkers.length > 0) {
          context += `Here are the markers the user has placed on this map:\n`;
          currentMarkers.forEach(m => {
            context += `- ${m.title}: ${m.notes} (Location: ${m.lat.toFixed(2)}, ${m.lng.toFixed(2)})\n`;
          });
        } else {
          context += `There are no markers placed on this map yet.\n`;
        }
      }

      const history = messages?.slice(-10).map(m => {
        const parts: any[] = [];
        if (m.imageData) {
          const base64Data = m.imageData.split(',')[1];
          const mimeType = m.imageData.split(';')[0].split(':')[1];
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            }
          });
        }
        if (m.text) {
          parts.push({ text: m.text });
        }
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts,
        };
      }) || [];

      const userParts: any[] = [];
      if (imageData) {
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];
        userParts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          }
        });
      }
      if (userText) {
        userParts.push({ text: userText });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: context }] },
          { role: 'model', parts: [{ text: 'Understood. I will use this context to help the user.' }] },
          ...history,
          { role: 'user', parts: userParts }
        ],
      });

      if (response.text) {
        await db.chatMessages.add({
          id: uuidv4(),
          profileId: activeProfileId,
          role: 'model',
          text: response.text,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      await db.chatMessages.add({
        id: uuidv4(),
        profileId: activeProfileId,
        role: 'model',
        text: 'Sorry, I encountered an error while processing your request.',
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    await db.chatMessages.where('profileId').equals(activeProfileId).delete();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="p-4 bg-white border-b border-neutral-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            AI Assistant
          </h2>
          <p className="text-sm text-neutral-500">Ask questions about your maps, markers, and notes.</p>
        </div>
        <button 
          onClick={clearChat}
          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Clear Chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
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
              {msg.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>}
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
