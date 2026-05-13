import { useState, useCallback } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI, Part } from '@google/genai';

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

export function useChat(activeProfileId: string, currentMapId: string | null) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const messages = useLiveQuery(
    () => db.chatMessages.where('profileId').equals(activeProfileId).sortBy('timestamp'),
    [activeProfileId]
  );

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

  const clearChat = useCallback(async () => {
    await db.chatMessages.where('profileId').equals(activeProfileId).delete();
  }, [activeProfileId]);

  const handleImageUpload = useCallback((file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setSelectedImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSend = useCallback(async (onResponse?: (text: string) => void) => {
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
          role: m.role,
          parts
        };
      }) || [];

      // Prepare User Parts
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

      let responseText = '';

      if (appSettings?.aiProvider === 'local') {
        const localEndpoint = appSettings.localAiEndpoint || 'http://localhost:1234/v1/chat/completions';
        const localModel = appSettings.localAiModel || 'llama-3.2-3b-instruct';

        const localHistory: OpenAIMessage[] = messages?.slice(-10).map(m => {
          if (m.imageData) {
             return {
               role: m.role === 'model' ? 'assistant' : 'user',
               content: [
                 { type: 'text', text: m.text || '' },
                 { type: 'image_url', image_url: { url: m.imageData } }
               ]
             };
          }
          return {
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text || ''
          };
        }) || [];

        let currentUserContent: string | OpenAIMessageContent[] = userText;
        if (imageData) {
           currentUserContent = [
             { type: 'text', text: userText },
             { type: 'image_url', image_url: { url: imageData } }
           ];
        }

        const payload: OpenAIPayload = {
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
        if (autoSpeak && onResponse) {
          // Strip out markdown or tool bracket text for cleaner reading
          const cleanText = responseText.replace(/\[Action:.*?\]/g, '').replace(/[*_#`]/g, '');
          onResponse(cleanText);
        }
      }
    } catch (error: unknown) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await db.chatMessages.add({
        id: uuidv4(),
        profileId: activeProfileId,
        role: 'model',
        text: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, isLoading, activeProfileId, appSettings, currentMap, currentMarkers, currentDrawings, messages, autoSpeak]);

  const handlePersonaChange = useCallback(async (newPersonaId: string) => {
    if (appSettings) {
      await db.settings.put({
        ...appSettings,
        activePersonaId: newPersonaId === 'default' ? undefined : newPersonaId
      });
    }
  }, [appSettings]);

  return {
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
  };
}
