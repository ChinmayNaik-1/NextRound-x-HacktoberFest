import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Mic,
  MicOff,
  ChevronRight,
  HeartHandshake,
  Bot,
  User,
  Sparkles,
  Award
} from 'lucide-react';
import { InterviewConfig, ChatMessage } from '../types';
import { sendInterviewChat } from '../services/api';
import { VoiceOrb } from '../components/VoiceOrb';
import { CameraFeed } from '../components/CameraFeed';

interface HRRoundScreenProps {
  config: InterviewConfig;
  onComplete: (transcript: ChatMessage[]) => void;
  onSkip: () => void;
}

export const HRRoundScreen: React.FC<HRRoundScreenProps> = ({
  config,
  onComplete,
  onSkip,
}) => {
  // 20-minute countdown (1200 seconds)
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [isRunning, setIsRunning] = useState(true);

  // AI Voice & State
  const [aiStatus, setAiStatus] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('speaking');
  const [aiCaption, setAiCaption] = useState("Interviewer is initiating the HR round...");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [typedInput, setTypedInput] = useState("");

  const speechRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initial HR Greeting & First Question
  useEffect(() => {
    async function startHR() {
      const opener = `Welcome ${config.candidate_name} to the HR & Behavioral interview for ${config.company}. I'd love to learn more about your working style, team collaboration, and what drives you. To start, could you give me a brief overview of yourself and what specifically attracted you to this role at ${config.company}?`;

      speakText(opener);
      addMessage("assistant", opener);
    }
    startHR();
  }, [config.company]);

  // 20-minute countdown
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
    speakText("Our 20 minutes for the HR round have concluded. It was a pleasure speaking with you! Let's generate your comprehensive interview scorecard.");
    onComplete(chatMessages);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // TTS & STT
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => {
      setAiStatus('speaking');
      setAiCaption(text);
    };
    utterance.onend = () => {
      setAiStatus('listening');
      setAiCaption("Listening to your response... (Speak now)");
      startMicRecognition();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startMicRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningMic(true);
        setAiStatus('listening');
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            handleUserResponse(finalTranscript);
          }
        }
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
        setAiStatus('idle');
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn("Speech rec err", e);
    }
  };

  const stopMicRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListeningMic(false);
      setAiStatus('idle');
    }
  };

  const handleUserResponse = async (text: string) => {
    if (!text.trim()) return;
    stopMicRecognition();
    addMessage("user", text);
    setAiStatus('thinking');
    setAiCaption("Evaluating your answer and structuring follow-up...");

    const reply = await sendInterviewChat(
      'hr',
      config.company,
      config.role,
      [...chatMessages, { id: 'usr', role: 'user', content: text, timestamp: '' }],
      config.resume_text,
      config.additional_context,
      config.provider,
      config.api_key
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
          <span className="font-semibold text-sm bg-green-50 text-brand-green border border-green-200 px-3 py-1 rounded-pill flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4" />
            HR & Behavioral Round
          </span>
          <span className="text-sm font-medium text-gray-700">{config.company}</span>
          <span className="text-xs text-gray-400 font-mono">Culture & Leadership Fit</span>
        </div>

        <div className="flex items-center gap-3">
          {/* 20-Minute Countdown Timer */}
          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3.5 py-1 rounded-pill font-mono text-sm font-semibold text-gray-800">
            <Clock className="w-4 h-4 text-brand-green" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>

          <button
            onClick={onSkip}
            className="text-xs text-gray-500 hover:text-gray-800 underline px-2 py-1"
          >
            Skip Round
          </button>

          <button
            onClick={() => onComplete(chatMessages)}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 bg-brand-green hover:bg-[#009b4d]"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Finish & View Assessment</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left (Voice Orb) | Right (Transcript) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Animated Voice Orb */}
        <div className="w-1/2 flex flex-col items-center justify-center p-8 bg-[#FAFAFA] border-r border-gray-200 relative">
          <div className="max-w-md text-center space-y-6">
            <VoiceOrb status={aiStatus} size="lg" caption={aiCaption} />

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-left space-y-2">
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-green" />
                HR Evaluation Framework (STAR)
              </span>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li><strong>Situation:</strong> The business or team context</li>
                <li><strong>Task:</strong> Your exact responsibility</li>
                <li><strong>Action:</strong> What you personally executed</li>
                <li><strong>Result:</strong> Measurable outcome and retrospective reflection</li>
              </ul>
            </div>

            {/* Mic / Type input */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={isListeningMic ? stopMicRecognition : startMicRecognition}
                className={`px-4 py-2 rounded-pill text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isListeningMic
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                }`}
              >
                {isListeningMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-gray-400" />}
                <span>{isListeningMic ? "Mic Active..." : "Push to Speak"}</span>
              </button>

              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typedInput.trim()) {
                    handleUserResponse(typedInput);
                    setTypedInput("");
                  }
                }}
                placeholder="Or type behavioral response..."
                className="flex-1 px-4 py-2 rounded-pill border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/30 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right: Conversation Transcript */}
        <div className="w-1/2 flex flex-col bg-white overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Live HR Transcript
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
                    msg.role === 'assistant' ? "bg-brand-green" : "bg-[#1A1A1A]"
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
