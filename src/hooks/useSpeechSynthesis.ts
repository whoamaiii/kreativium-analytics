import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechSynthesisOptions {
  preferredLang?: string;
}

interface UseSpeechSynthesisReturn {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => boolean;
  cancel: () => void;
}

export const useSpeechSynthesis = (options: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn => {
  const { preferredLang } = options;
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    setSupported(true);

    const updateVoices = () => {
      voicesRef.current = synth.getVoices();
    };

    updateVoices();
    synth.addEventListener('voiceschanged', updateVoices);

    return () => {
      mountedRef.current = false;
      synth.removeEventListener('voiceschanged', updateVoices);
      synth.cancel();
    };
  }, []);

  const speak = useCallback((input: string) => {
    if (!supported || typeof window === 'undefined') return false;
    const synth = window.speechSynthesis;
    if (!synth) return false;

    const text = input.trim();
    if (!text) return false;

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const normalizedLang = preferredLang?.toLowerCase();
    if (normalizedLang) {
      const chosen = voicesRef.current.find(voice => voice.lang.toLowerCase().startsWith(normalizedLang));
      if (chosen) {
        utterance.voice = chosen;
      }
    }

    utterance.onstart = () => {
      if (mountedRef.current) setSpeaking(true);
    };

    const reset = () => {
      if (mountedRef.current) setSpeaking(false);
    };

    utterance.onend = reset;
    utterance.onerror = reset;

    synth.speak(utterance);
    return true;
  }, [preferredLang, supported]);

  const cancel = useCallback(() => {
    if (!supported || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    if (mountedRef.current) {
      setSpeaking(false);
    }
  }, [supported]);

  return {
    supported,
    speaking,
    speak,
    cancel,
  };
};
