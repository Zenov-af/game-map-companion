'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { Send, Bot, User, Trash2, ImagePlus, X } from 'lucide-react';
import { GoogleGenAI, Part } from '@google/genai';

export default function ChatComponent({ currentMapId, activeProfileId }: { currentMapId: string | null, activeProfileId: string }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

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
      // Determine active persona prompt
      let basePrompt = appSettings?.systemPrompt || 'You are a helpful AI assistant for a game map companion app.';
      if (appSettings?.activePersonaId && appSettings.personas) {
        const activePersona = appSettings.personas.find(p => p.id === appSettings.activePersonaId);
        if (activePersona) {
          basePrompt = activePersona.prompt;
        }
      }

      let context = `${basePrompt}\n\n`;

      if (appSettings?.includeMapContext !== false && currentMap) {
        context += `The user is currently looking at a map named "${currentMap.name}".\n`;
      }

      if (appSettings?.includeMarkersContext !== false && currentMap) {
        if (currentMarkers && currentMarkers.length > 0) {
          context += `Here are the markers the user has placed on this map:\n`;
          currentMarkers.forEach(m => {
            context += `- ${m.title}: ${m.notes} (Category: ${m.category || 'General'}) (Location: ${m.lat.toFixed(2)}, ${m.lng.toFixed(2)})\n`;
          });
        } else {
          context += `There are no markers placed on this map yet.\n`;
        }

        if (currentDrawings && currentDrawings.length > 0) {
          context += `Here are the drawings/territories the user has made on this map:\n`;
          currentDrawings.forEach(d => {
            context += `- [${d.type.toUpperCase()}] ${d.title}: ${d.notes} (Category: ${d.category || 'General'})\n`;
          });
        }
      }

      // Prepare History for Gemini format
      const history: { role: string; parts: Part[] }[] = messages?.slice(-10).map(m => {
        const parts: Part[] = [];
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

      // Prepare current user parts
      const userParts: Part[] = [];
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

      const contents = [
        { role: 'user', parts: [{ text: context }] },
        { role: 'model', parts: [{ text: 'Understood. I will use this context to help the user.' }] },
        ...history,
        { role: 'user', parts: userParts }
      ];

      const chatHistory = messages?.slice(-10) || [];
      let responseText = '';

      if (appSettings?.aiProvider === 'local') {
        const localEndpoint = appSettings?.localAiEndpoint || 'http://localhost:1234/v1/chat/completions';
        const localModel = appSettings?.localAiModel || 'local-model';

        // Convert chat history to OpenAI format, supporting multi-modal content if images are present
        const localHistory = chatHistory.map(m => {
          let content: any = m.text || '';

          if (m.imageData) {
            content = [
              { type: 'text', text: m.text || '' },
              { type: 'image_url', image_url: { url: m.imageData } }
            ];
          }

          return {
            role: m.role === 'user' ? 'user' : 'assistant',
            content
          };
        });

        let currentUserContent: any = userText;
        if (imageData) {
           currentUserContent = [
             { type: 'text', text: userText },
             { type: 'image_url', image_url: { url: imageData } }
           ];
        }

        const payload: any = {
          model: localModel,
          messages: [
            { role: 'system', content: context },
            ...localHistory,
            { role: 'user', content: currentUserContent }
          ]
        };

        if (appSettings?.temperature !== undefined) payload.temperature = appSettings.temperature;
        if (appSettings?.maxTokens !== undefined) payload.max_tokens = appSettings.maxTokens;

        const res = await fetch(localEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Local AI request failed: ${res.statusText}`);
        }

        const data = await res.json();
        responseText = data.choices[0].message.content;

      } else if (appSettings?.geminiApiKey) {
        // Client-side Gemini (User provided API key)
        const ai = new GoogleGenAI({ apiKey: appSettings.geminiApiKey });
        const config: any = {};
        if (appSettings?.temperature !== undefined) config.temperature = appSettings.temperature;
        if (appSettings?.maxTokens !== undefined) config.maxOutputTokens = appSettings.maxTokens;

        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [
            { role: 'user', parts: [{ text: context }] },
            { role: 'model', parts: [{ text: 'Understood. I will use this context to help the user.' }] },
            ...history,
            { role: 'user', parts: userParts }
          ],
          config: Object.keys(config).length > 0 ? config : undefined
        });

        responseText = response.text || '';

      } else {
        // Server-side Proxy (Default)
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            history,
            userParts,
            temperature: appSettings?.temperature,
            maxTokens: appSettings?.maxTokens
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to get AI response');
        }

        const data = await res.json();
        responseText = data.text;
      }

      if (responseText) {
        await db.chatMessages.add({
          id: uuidv4(),
          profileId: activeProfileId,
          role: 'model',
          text: responseText,
          timestamp: Date.now(),
        });
        if (autoSpeak) {
          // Strip out markdown or tool bracket text for cleaner reading
          const cleanText = responseText.replace(/\[Action:.*?\]/g, '').replace(/[*_#`]/g, '');
          speakText(cleanText);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      await db.chatMessages.add({
        id: uuidv4(),
        profileId: activeProfileId,
        role: 'model',
        text: `Sorry, I encountered an error: ${error.message}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    await db.chatMessages.where('profileId').equals(activeProfileId).delete();
  };

  const handlePersonaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPersonaId = e.target.value;
    if (appSettings) {
      await db.settings.put({
        ...appSettings,
        activePersonaId: newPersonaId === 'default' ? undefined : newPersonaId
      });
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
