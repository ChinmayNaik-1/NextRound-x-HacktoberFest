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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

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
      // Ignore canceled error if caused by explicit stop/interruption
      if (e.error !== 'canceled' && onError) {
        onError(e);
      }
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
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
