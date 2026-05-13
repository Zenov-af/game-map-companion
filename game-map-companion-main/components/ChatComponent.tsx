'use client';

import { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useChat } from '@/hooks/useChat';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';

export default function ChatComponent({ currentMapId, activeProfileId }: { currentMapId: string | null, activeProfileId: string }) {
  const {
    input,
    setInput,
    isLoading,
    selectedImage,
    setSelectedImage,
    autoSpeak,
    setAutoSpeak,
    messages,
    appSettings,
    clearChat,
    handleImageUpload,
    handleSend,
    handlePersonaChange
  } = useChat(activeProfileId, currentMapId);

  const { isListening, toggleListening } = useSpeechRecognition((transcript) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  });

  const { speakText } = useSpeechSynthesis();
import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Send, Bot, User, Trash2, ImagePlus, X, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';
import { Send, Bot, User, Trash2, ImagePlus, X, Mic, MicOff } from 'lucide-react';
import { GoogleGenAI, Part } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Web Speech API Interfaces ---
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface OpenAIMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIMessageContent[];
}

interface OpenAIPayload {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

export default function ChatComponent({ currentMapId, activeProfileId }: { currentMapId: string | null, activeProfileId: string }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = () => {
    handleSend((text) => {
      if (autoSpeak) {
        speakText(text);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
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
      id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
    });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <ChatHeader
        onClearChat={clearChat}
        appSettings={appSettings}
        onPersonaChange={(e) => handlePersonaChange(e.target.value)}
      />

      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        isListening={isListening}
        toggleListening={toggleListening}
        onSend={onSend}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}
