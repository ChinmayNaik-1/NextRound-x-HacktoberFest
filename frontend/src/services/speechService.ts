// Audio, TTS and STT Services for NextRound Desktop Platform

export class SpeechService {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static selectedVoice: SpeechSynthesisVoice | null = null;

  // Initialize and select the best available voice
  public static initVoice(): Promise<SpeechSynthesisVoice | null> {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve(null);
        return;
      }

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;

        // Prefer natural English voices
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy') ||
              v.name.includes('Samantha') ||
              v.name.includes('David'))
        ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

        SpeechService.selectedVoice = preferred;
        return preferred;
      };

      const voice = pickVoice();
      if (voice) {
        resolve(voice);
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(pickVoice());
        };
        setTimeout(() => resolve(pickVoice()), 1000);
      }
    });
  }

  // Play an instant pleasant confirmation chime via Web Audio API
  public static playChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          resolve();
          return;
        }
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Note 1: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Note 2: E5 (659.25 Hz) slightly delayed
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.12);
        gain2.gain.setValueAtTime(0.18, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.55);

        setTimeout(() => {
          ctx.close().catch(() => {});
          resolve();
        }, 600);
      } catch {
        resolve();
      }
    });
  }

  // 1. Text-to-Speech (TTS)
  public static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (!window.speechSynthesis) {
      if (onError) onError(new Error("Speech synthesis not supported"));
      return;
    }

    // Cancel any previous utterance immediately
    window.speechSynthesis.cancel();

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // Chromium Bugfix: Unfreeze paused synth if desynced
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best voice on the fly if not yet cached
    if (!SpeechService.selectedVoice) {
      const voices = window.speechSynthesis.getVoices();
      SpeechService.selectedVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Jenny') ||
            v.name.includes('David') ||
            v.name.includes('Samantha'))
      ) || voices.find((v) => v.lang.startsWith('en')) || null;
    }

    if (SpeechService.selectedVoice) {
      utterance.voice = SpeechService.selectedVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && onError) {
        onError(e);
      }
      if (onEnd) onEnd();
    };

    // Chromium Bugfix: Small 60ms delay allows Chromium's audio stream pipeline to unfreeze after cancel()
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    }, 60);
  }

  // Interrupt AI immediately
  public static stopSpeaking(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public static isSpeaking(): boolean {
    return window.speechSynthesis ? window.speechSynthesis.speaking : false;
  }

  // 2. Speech-to-Text (STT)
  public static isSpeechRecognitionSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public static startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError?: (err: any) => void,
    onEnd?: () => void
  ): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (onError) onError(new Error("Speech recognition not supported in this browser/environment"));
      return false;
    }

    try {
      if (SpeechService.recognition) {
        SpeechService.recognition.abort();
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        SpeechService.isListening = true;
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            onFinal(item[0].transcript);
          } else {
            interimTranscript += item[0].transcript;
          }
        }
        if (interimTranscript) {
          onInterim(interimTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== 'no-speech' && onError) {
          onError(event);
        }
      };

      rec.onend = () => {
        SpeechService.isListening = false;
        if (onEnd) onEnd();
      };

      rec.start();
      SpeechService.recognition = rec;
      return true;
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      if (onError) onError(err);
      return false;
    }
  }

  public static stopListening(): void {
    if (SpeechService.recognition) {
      try {
        SpeechService.recognition.stop();
      } catch (e) {
        // Ignore stop error
      }
      SpeechService.recognition = null;
      SpeechService.isListening = false;
    }
  }

  public static isCurrentlyListening(): boolean {
    return SpeechService.isListening;
  }
}
