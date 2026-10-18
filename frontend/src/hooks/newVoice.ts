import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

export type VoiceStatus = 'idle' | 'listening' | 'speaking' | 'thinking';

/** Messages kept in state (for rendering) AND a ref (so async callbacks never see stale history). */
export function useTranscript() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const ref = useRef<ChatMessage[]>([]);
  const add = useCallback((role: 'assistant' | 'user', content: string) => {
    const m: ChatMessage = {
      id: crypto.randomUUID(), role, content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    ref.current = [...ref.current, m];
    setMessages(ref.current);
    return m;
  }, []);
  return { messages, ref, add };
}

/** Wall-clock countdown. Starts when `running` first becomes true; onExpire fires exactly once. */
export function useCountdown(totalSeconds: number, onExpire: () => void, running = true) {
  const [left, setLeft] = useState(totalSeconds);
  const endRef = useRef<number | null>(null);
  const fired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    if (!running) return;
    if (endRef.current === null) endRef.current = Date.now() + totalSeconds * 1000;
    const tick = () => {
      const l = Math.max(0, Math.ceil((endRef.current! - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && !fired.current) {
        fired.current = true;
        cb.current();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [running, totalSeconds]);

  return left;
}

export const formatTimer = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

interface Opts {
  autoListen: boolean;
  onFinal: (text: string) => void;
}

/** Speech synthesis + recognition with cleanup, no duplicate recognizers and no stale closures. */
export function useVoice({ autoListen, onFinal }: Opts) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [caption, setCaption] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recRef = useRef<any>(null);
  const wantRef = useRef(false);
  const speakingRef = useRef(false);
  const speakId = useRef(0);
  const startRef = useRef<() => void>();
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const autoRef = useRef(autoListen);
  autoRef.current = autoListen;

  const SR: any = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const supported = !!SR;

  const killRecognizer = () => {
    const r = recRef.current;
    recRef.current = null;
    if (r) {
      r.onend = null;
      try { r.abort(); } catch { /* ignore */ }
    }
    setIsListening(false);
  };

  const stopListening = useCallback(() => {
    wantRef.current = false;
    killRecognizer();
    setStatus((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  const startListening = useCallback(() => {
    if (!SR || recRef.current || speakingRef.current) return;
    wantRef.current = true;
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onstart = () => { setIsListening(true); setStatus('listening'); setCaption('Listening… speak naturally'); };
    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = String(e.results[i][0].transcript).trim();
          if (t) onFinalRef.current(t);
        }
      }
    };
    r.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantRef.current = false;
        setCaption('Microphone is blocked. Type your answer instead.');
      }
    };
    r.onend = () => {
      recRef.current = null;
      setIsListening(false);
      if (wantRef.current && !speakingRef.current) setTimeout(() => startRef.current?.(), 300);
      else setStatus((s) => (s === 'listening' ? 'idle' : s));
    };
    recRef.current = r;
    try { r.start(); } catch { recRef.current = null; }
  }, [SR]);
  startRef.current = startListening;

  const speak = useCallback((text: string) => {
    const id = ++speakId.current;
    killRecognizer();
    if (!('speechSynthesis' in window)) {
      setCaption(text);
      if (autoRef.current) startRef.current?.();
      return;
    }
    window.speechSynthesis.cancel();
    speakingRef.current = true;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.03;
    u.onstart = () => { setStatus('speaking'); setCaption(text); };
    const done = () => {
      if (id !== speakId.current) return; // a newer utterance replaced this one
      speakingRef.current = false;
      setStatus('idle');
      setCaption(autoRef.current ? 'Your turn. Speak or type.' : 'The interviewer is listening.');
      if (autoRef.current) startRef.current?.();
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }, []);

  const cancelAll = useCallback(() => {
    speakId.current++;
    speakingRef.current = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    wantRef.current = false;
    killRecognizer();
  }, []);

  useEffect(() => () => cancelAll(), [cancelAll]);

  return { status, setStatus, caption, setCaption, isListening, supported, speak, startListening, stopListening, cancelAll };
}