import React, { useRef } from 'react';
import { ImagePlus, Mic, MicOff, Send, X } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  selectedImage: string | null;
  setSelectedImage: (value: string | null) => void;
  isListening: boolean;
  toggleListening: () => void;
  onSend: () => void;
  onImageUpload: (file: File | undefined) => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  selectedImage,
  setSelectedImage,
  isListening,
  toggleListening,
  onSend,
  onImageUpload
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageUpload(e.target.files?.[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
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
          onChange={handleFileChange}
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
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          disabled={isLoading}
        />
        <button
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12"
          onClick={onSend}
          disabled={isLoading || (!input.trim() && !selectedImage)}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
