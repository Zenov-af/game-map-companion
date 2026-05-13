import { useCallback } from 'react';

export function useSpeechSynthesis() {
  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speakText };
}
