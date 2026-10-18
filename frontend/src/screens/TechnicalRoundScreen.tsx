import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Mic,
  MicOff,
  ChevronRight,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  User,
  Bot,
  SkipForward,
  Square,
  Send,
  Loader2,
  Trash2
} from 'lucide-react';
import { InterviewConfig, ChatMessage } from '../types';
import { sendInterviewChat, transcribeAudio } from '../services/api';
import { SpeechService } from '../services/speechService';
import { VoiceOrb } from '../components/VoiceOrb';
import { CameraFeed } from '../components/CameraFeed';

interface TechnicalRoundScreenProps {
  config: InterviewConfig;
  onComplete: (transcript: ChatMessage[]) => void;
  onSkip: () => void;
}

export const TechnicalRoundScreen: React.FC<TechnicalRoundScreenProps> = ({
  config,
  onComplete,
  onSkip,
}) => {
  // 40-minute countdown (2400 seconds)
  const [secondsLeft, setSecondsLeft] = useState(40 * 60);
  const [isRunning, setIsRunning] = useState(true);

  // AI Voice & State
  const [aiStatus, setAiStatus] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('speaking');
  const [aiCaption, setAiCaption] = useState("Interviewer is introducing the technical round...");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);


  const speechRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initial Technical Opening
  useEffect(() => {
    async function startRound() {
      const isAI = config.role.toLowerCase().includes("ai") || config.role.toLowerCase().includes("machine learning");
      const initialTopic = isAI
        ? "machine learning architectures, model evaluation metrics, and LLM fine-tuning pipelines"
        : "distributed systems, database indexing, concurrency, and architecture trade-offs";

      const opener = `Hello ${config.candidate_name}. Welcome to your Technical Deep-Dive round for the ${config.role} position at ${config.company}. We will focus on your resume projects, hands-on architectural decisions, and ${initialTopic}. To kick off, could you walk me through the most technically challenging project on your resume? What core architectural trade-offs did you face?`;

      speakText(opener);
      addMessage("assistant", opener);
    }
    startRound();
  }, [config.company, config.role]);

  // 40-Minute Timer
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleTimeExpired = () => {
    speakText("Our 40 minutes for the technical round have concluded. Great discussion! Let's proceed to the next stage.");
    onComplete(chatMessages);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // TTS & STT
  const speakText = (text: string) => {
    setAiStatus('speaking');
    setAiCaption(text);
    SpeechService.speak(
      text,
      () => {
        setAiStatus('speaking');
        setAiCaption(text);
      },
      () => {
        setAiStatus('idle');
        setAiCaption("Interviewer finished speaking. Click 'Start Speaking' or type your answer when ready.");
      },
      () => {
        setAiStatus('idle');
        setAiCaption("Ready for your answer.");
      }
    );
  };

  const handleInterrupt = () => {
    SpeechService.stopSpeaking();
    setAiStatus('idle');
    setAiCaption("Interrupted interviewer. You can speak or type your answer now.");
  };

  const startMicRecognition = async () => {
    SpeechService.stopSpeaking();
    setIsListeningMic(true);
    setRecordingSeconds(0);
    setAiStatus('listening');
    setAiCaption("Listening to your response... Click 'Stop Mic' or Send when done.");

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    await SpeechService.startRecording(
      (interim) => {
        // Live interim feedback
      },
      (finalText) => {
        setTypedInput((prev) => (prev ? prev + " " + finalText : finalText));
      },
      (err) => {
        console.warn("Speech recognition notice:", err);
      }
    );
  };

  const stopMicRecognition = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsListeningMic(false);
    if (aiStatus === 'listening') {
      setAiStatus('idle');
      setAiCaption("Mic stopped. Review your response and click 'Send'.");
    }

    setIsTranscribing(true);
    try {
      const result = await SpeechService.stopRecording();
      if (result.text && result.text.trim()) {
        setTypedInput((prev) => {
          if (!prev.includes(result.text)) {
            return prev ? `${prev} ${result.text}` : result.text;
          }
          return prev;
        });
      } else if (result.audioBlob && result.audioBlob.size > 1000) {
        setAiCaption("Transcribing speech with AI...");
        const res = await transcribeAudio(
          result.audioBlob,
          config.provider,
          config.api_key,
          config.key_id
        );
        if (res.transcript && res.transcript.trim()) {
          setTypedInput((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
          setAiCaption("Transcription complete. Review and click 'Send'.");
        }
      }
    } catch (err) {
      console.warn("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUserResponse = async (text: string) => {
    if (!text.trim()) return;
    if (isListeningMic) {
      await stopMicRecognition();
    }
    addMessage("user", text);
    setTypedInput("");
    setAiStatus('thinking');
    setAiCaption("Evaluating technical depth and formulating response...");

    const reply = await sendInterviewChat(
      'technical',
      config.company,
      config.role,
      [...chatMessages, { id: 'usr', role: 'user', content: text, timestamp: '' }],
      config.resume_text,
      config.additional_context,
      config.provider,
      config.api_key,
      config.key_id
    );

    addMessage("assistant", reply);
    speakText(reply);
  };


  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-[#1A1A1A] overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm bg-red-50 text-brand-red border border-red-200 px-3 py-1 rounded-pill flex items-center gap-1.5">
            <Cpu className="w-4 h-4" />
            Technical Round
          </span>
          <span className="text-sm font-medium text-gray-700">{config.company}</span>
          <span className="text-xs text-gray-400 font-mono">Role: {config.role}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* 40-Minute Countdown Timer */}
          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3.5 py-1 rounded-pill font-mono text-sm font-semibold text-gray-800">
            <Clock className="w-4 h-4 text-brand-red" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>

          <button
            onClick={onSkip}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-pill flex items-center gap-1 font-medium transition-colors cursor-pointer"
            title="Skip this technical round and proceed"
          >
            <SkipForward className="w-3.5 h-3.5 text-gray-500" />
            <span>Skip Round</span>
          </button>

          <button
            onClick={() => onComplete(chatMessages)}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Conclude Round</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split: Left (Animated AI Voice Orb & Controls) | Right (Conversation Transcript) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Voice Orb & Visualizer */}
        <div className="w-1/2 flex flex-col items-center justify-center p-8 bg-[#FAFAFA] border-r border-gray-200 relative">
          <div className="max-w-md text-center space-y-6">
            <VoiceOrb status={aiStatus} size="lg" caption={aiCaption} />

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-left space-y-2">
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-red" />
                Technical Interview Focus Areas
              </span>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Production project architecture & scaling decisions</li>
                <li>Database indexing, caching, and consistency trade-offs</li>
                <li>CS fundamentals: Concurrency, race conditions, memory management</li>
                <li>Failure scenarios, metrics, and incident recovery</li>
              </ul>
            </div>

            {/* Interruption Button when AI is speaking */}
            {aiStatus === 'speaking' && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2 rounded-pill text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm animate-pulse transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-amber-700" />
                  <span>Interrupt Interviewer & Answer</span>
                </button>
              </div>
            )}

            {/* Candidate Response Dock with Multi-line Textarea */}
            <div className="space-y-2 w-full">
              {/* Meta strip: STT status indicator */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <div className="flex items-center gap-2">
                  {isListeningMic && (
                    <span className="inline-flex items-center gap-1.5 text-brand-red font-semibold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Recording Voice ({recordingSeconds}s)... Speak clearly
                    </span>
                  )}
                  {isTranscribing && (
                    <span className="inline-flex items-center gap-1.5 text-brand-blue font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Transcribing speech with AI...
                    </span>
                  )}
                  {!isListeningMic && !isTranscribing && (
                    <span className="text-gray-500">
                      {typedInput.trim() ? "Edit transcript before submitting answer" : "Speak via mic or type your technical answer"}
                    </span>
                  )}
                </div>
              </div>

              {/* Textarea + Mic & Action dock */}
              <div className="relative flex items-end gap-2 bg-white border border-gray-300 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 rounded-2xl p-2.5 shadow-sm transition-all">
                <button
                  type="button"
                  onClick={isListeningMic ? stopMicRecognition : startMicRecognition}
                  disabled={isTranscribing}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isListeningMic
                      ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                  }`}
                  title={isListeningMic ? "Stop recording and transcribe" : "Click to speak using microphone"}
                >
                  {isListeningMic ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-brand-blue" />
                      <span>Start Speaking</span>
                    </>
                  )}
                </button>

                <textarea
                  rows={2}
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && typedInput.trim()) {
                      e.preventDefault();
                      handleUserResponse(typedInput);
                    }
                  }}
                  placeholder={
                    isListeningMic
                      ? "Listening to speech... your words will appear here"
                      : "Type or speak your technical explanation, architectural trade-offs, or questions..."
                  }
                  className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none leading-relaxed py-1"
                />

                {typedInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setTypedInput("")}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                    title="Clear text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  disabled={!typedInput.trim() || isTranscribing}
                  onClick={() => {
                    if (typedInput.trim()) {
                      handleUserResponse(typedInput);
                    }
                  }}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                <span>Press <kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200">Enter</kbd> to send, <kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200">Shift + Enter</kbd> for new line</span>
                {typedInput.length > 0 && <span>{typedInput.length} characters</span>}
              </div>

              {/* Quick Skip Question Button */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span>Unable to answer this question?</span>
                <button
                  type="button"
                  onClick={() => handleUserResponse("I am not sure about this topic or unable to answer right now. Could we please skip to a different technical question or architectural topic?")}
                  className="text-brand-blue hover:underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skip Question & Ask Next Topic</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Scrollable Conversation Transcript */}
        <div className="w-1/2 flex flex-col bg-white overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Live Technical Transcript
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {chatMessages.length} exchanges
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${
                  msg.role === 'assistant' ? "items-start" : "items-start flex-row-reverse"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${
                    msg.role === 'assistant' ? "bg-brand-red" : "bg-[#1A1A1A]"
                  }`}
                >
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl p-4 leading-relaxed ${
                    msg.role === 'assistant'
                      ? "bg-[#F8F9FA] text-gray-800 border border-gray-200"
                      : "bg-[#1A1A1A] text-white"
                  }`}
                >
                  <p className="text-xs">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      msg.role === 'assistant' ? "text-gray-400" : "text-gray-400 text-right"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Candidate Camera Feed PiP */}
      <CameraFeed isPiP={true} />
    </div>
  );
};
