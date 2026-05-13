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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = () => {
    handleSend((text) => {
      if (autoSpeak) {
        speakText(text);
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
