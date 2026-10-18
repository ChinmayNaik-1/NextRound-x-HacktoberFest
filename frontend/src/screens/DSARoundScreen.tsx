import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import {
  Play,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  ChevronRight,
  Volume2,
  Mic,
  MicOff,
  Code2,
  Sparkles,
  AlertCircle,
  SkipForward,
  HelpCircle,
  Square,
  Loader2,
  Trash2
} from 'lucide-react';
import { InterviewConfig, Question, ExecutionReport, CodeAnalysis, ChatMessage } from '../types';
import { fetchCompanyQuestion, runCode, analyzeCode, sendInterviewChat, transcribeAudio } from '../services/api';
import { CameraFeed } from '../components/CameraFeed';
import { VoiceOrb } from '../components/VoiceOrb';
import { useTheme } from '../ThemeContext';
import { SpeechService } from '../services/speechService';


interface DSARoundScreenProps {
  roundName: string; // "DSA Round 1" or "DSA Round 2"
  config: InterviewConfig;
  onComplete: (transcript: ChatMessage[], codeSubmission: any) => void;
  onSkip: () => void;
}

interface ResizeHandleProps {
  axis: 'x' | 'y';
  value: number;
  reverse?: boolean;
  label: string;
  onChange: (value: number) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  axis,
  value,
  reverse = false,
  label,
  onChange,
}) => {
  const updatePosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;

    const offset = axis === 'x' ? event.clientX - bounds.left : event.clientY - bounds.top;
    const size = axis === 'x' ? bounds.width : bounds.height;
    const percent = (offset / size) * 100;
    onChange(Math.max(15, Math.min(85, reverse ? 100 - percent : percent)));
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className={`group relative z-10 shrink-0 touch-none ${
        axis === 'x' ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      }`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePosition(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePosition(event);
      }}
      onKeyDown={(event) => {
        const direction = axis === 'x'
          ? (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)
          : (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0);
        if (direction) {
          event.preventDefault();
          onChange(Math.max(15, Math.min(85, value + direction * (reverse ? -2 : 2))));
        }
      }}
    >
      <div
        className={`absolute rounded-full bg-gray-300 transition-colors group-hover:bg-brand-blue group-focus-visible:bg-brand-blue ${
          axis === 'x'
            ? 'inset-y-0 left-1/2 w-px -translate-x-1/2'
            : 'inset-x-0 top-1/2 h-px -translate-y-1/2'
        }`}
      />
    </div>
  );
};

export const DSARoundScreen: React.FC<DSARoundScreenProps> = ({
  roundName,
  config,
  onComplete,
  onSkip,
}) => {
  const { theme } = useTheme();
  const [question, setQuestion] = useState<Question | null>(null);
  const [language, setLanguage] = useState<'python' | 'cpp' | 'java'>('python');
  const [code, setCode] = useState("");
  
  // 25-minute timer (1500 seconds)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(true);

  // Execution & Test cases
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execReport, setExecReport] = useState<ExecutionReport | null>(null);

  // AI Voice & Dialog
  const [isGreetingPhase, setIsGreetingPhase] = useState(true);
  const [aiStatus, setAiStatus] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('speaking');
  const [aiCaption, setAiCaption] = useState("Interviewer is introducing the problem...");
  const aiCaptionRef = useRef<HTMLParagraphElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [userInputText, setUserInputText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const [isAnalyzingApproach, setIsAnalyzingApproach] = useState(false);
  const responseTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [problemPanePercent, setProblemPanePercent] = useState(42);
  const [testPanePercent, setTestPanePercent] = useState(30);
  const [mainAreaPercent, setMainAreaPercent] = useState(74);
  const [interviewerPanePercent, setInterviewerPanePercent] = useState(38);

  const [codeAnalysis, setCodeAnalysis] = useState<CodeAnalysis | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const speechRecognitionRef = useRef<any>(null);
  const hasStartedRef = useRef<boolean>(false);
  const isSendingRef = useRef<boolean>(false);

  useEffect(() => {
    const caption = aiCaptionRef.current;
    if (caption) caption.scrollTop = caption.scrollHeight;
  }, [aiCaption]);

  useEffect(() => {
    const textarea = responseTextareaRef.current;
    if (!textarea) return;

    const maxHeight = 144;
    textarea.style.height = 'auto';
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
    textarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    textarea.scrollTop = textarea.scrollHeight;
  }, [userInputText]);

  const compactPrompt = (text: string) => {
    const question = text.match(/[^.!?]*\?/g)?.at(-1)?.trim() || text.trim();
    const prompt = question
      .replace(/^(?:could you|can you|would you|please)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();
    const normalized = prompt ? prompt[0].toUpperCase() + prompt.slice(1) : "Ready for questions";
    return normalized.length > 72 ? `${normalized.slice(0, 69).trimEnd()}...` : normalized;
  };

  // 1. Fetch Company Question (guarded against duplicate execution)
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    async function init() {
      const q = await fetchCompanyQuestion(config.company, config.difficulty);
      setQuestion(q);
      setCode(q.starter_code[language] || "");

      // Welcome voice message
      const greeting = `Welcome ${config.candidate_name} to your ${roundName} for ${config.company}. You have 25 minutes to review the problem and submit an optimal solution. Feel free to explain your approach aloud as you code.`;
      speakText(greeting, "Review the problem");
      addMessage("assistant", greeting);
    }
    init();
  }, [config.company, config.difficulty]);

  // Update starter code when language switches
  const handleLanguageChange = (newLang: 'python' | 'cpp' | 'java') => {
    setLanguage(newLang);
    if (question) {
      setCode(question.starter_code[newLang] || "");
    }
  };

  // 2. Countdown Timer
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
    speakText("Time is up for this coding problem. Let's move on to analyzing your approach.", "Review your approach");
    handleSubmission(false);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      SpeechService.stopSpeaking();
      SpeechService.stopListening();
    };
  }, []);

  // 3. SpeechService (TTS & STT with push-to-talk & interruption)
  const speakText = (text: string, finishedCaption = compactPrompt(text)) => {
    setAiStatus('speaking');
    setAiCaption(text);
    SpeechService.speak(
      text,
      () => {
        setAiStatus('speaking');
      },
      () => {
        setAiStatus('idle');
        setAiCaption(finishedCaption);
      },
      () => {
        setAiStatus('idle');
        setAiCaption(finishedCaption);
      },
      setAiCaption
    );
  };

  const handleInterrupt = () => {
    SpeechService.stopSpeaking();
    setAiStatus('idle');
    setAiCaption("Interrupted interviewer. You can speak or type your question/explanation now.");
  };

  const startMicRecognition = async () => {
    SpeechService.stopSpeaking();
    setIsListeningMic(true);
    setRecordingSeconds(0);
    setAiStatus('listening');
    setAiCaption("Listening to your voice... Speak your explanation or question.");

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    await SpeechService.startRecording(
      (interim) => {
        // live interim transcript
      },
      (finalText) => {
        setUserInputText((prev) => (prev ? prev + " " + finalText : finalText));
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
      setAiCaption("Mic stopped. Review your explanation and click 'Send'.");
    }

    setIsTranscribing(true);
    try {
      const result = await SpeechService.stopRecording();
      if (result.text && result.text.trim()) {
        setUserInputText((prev) => {
          if (!prev.includes(result.text)) {
            return prev ? `${prev} ${result.text}` : result.text;
          }
          return prev;
        });
      } else if (result.audioBlob && result.audioBlob.size > 1000) {
        // Call backend transcription fallback (works seamlessly in Electron!)
        setAiCaption("Transcribing speech with AI...");
        const res = await transcribeAudio(
          result.audioBlob,
          config.provider,
          config.api_key,
          config.key_id
        );
        if (res.transcript && res.transcript.trim()) {
          setUserInputText((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
          setAiCaption("Transcription complete. Review and click 'Send'.");
        }
      }
    } catch (err) {
      console.warn("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUserSpokenMessage = async (text: string) => {
    if (!text.trim() || isSendingRef.current) return;
    isSendingRef.current = true;

    if (isListeningMic) {
      await stopMicRecognition();
    }
    addMessage("user", text);
    setUserInputText("");
    setAiStatus('thinking');
    setAiCaption("AI is evaluating your code, test results & explanation...");

    const submissionStatus = execReport
      ? (execReport.all_passed ? "all_tests_passed" : "tests_run")
      : (code.trim().length > 30 ? "drafting_code" : "not_started");

    try {
      // Send to agent for interview turn with complete context!
      const reply = await sendInterviewChat(
        'dsa_1',
        config.company,
        config.role,
        [...chatMessages, { id: 'usr', role: 'user', content: text, timestamp: '' }],
        config.resume_text,
        config.additional_context,
        config.provider,
        config.api_key,
        config.key_id,
        question,
        code,
        language,
        execReport,
        submissionStatus
      );

      addMessage("assistant", reply);
      speakText(reply);
    } catch (err) {
      console.error("handleUserSpokenMessage error:", err);
    } finally {
      isSendingRef.current = false;
    }
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

  // 4. Request Hint from AI
  const handleRequestHint = async () => {
    if (!question) return;
    const hintPrompt = `Candidate is asking for an algorithmic hint on problem "${question.title}". Current code status: ${execReport ? `${execReport.passed_cases}/${execReport.total_cases} tests passed` : 'Not tested yet'}. Please give a focused, 1-2 sentence hint about what approach, data structure, or boundary condition to look at.`;
    addMessage("user", "I'm a bit stuck on this problem. Could you provide a small hint or nudge in the right direction?");
    setAiStatus('thinking');
    setAiCaption("AI interviewer is examining your code and formulating a helpful hint...");

    const reply = await sendInterviewChat(
      'dsa_1',
      config.company,
      config.role,
      [...chatMessages, { id: 'usr-hint', role: 'user', content: hintPrompt, timestamp: '' }],
      config.resume_text,
      config.additional_context,
      config.provider,
      config.api_key,
      config.key_id,
      question,
      code,
      language,
      execReport,
      "hint_requested"
    );

    addMessage("assistant", reply);
    speakText(reply);
  };


  // 5. Run Code (Visible cases only)
  const handleRunCode = async () => {
    if (!question) return;
    setIsExecuting(true);
    try {
      // 5 open test cases
      const openCases = question.test_cases.filter((tc) => !tc.hidden);
      const res = await runCode(language, code, question.id, openCases);
      setExecReport(res);
      if (res.all_passed) {
        speakText("Good work! All visible test cases passed. Consider running edge cases or submitting your final code.");
      } else {
        speakText("Some visible test cases failed. Take a look at the actual output versus expected.");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  // 5. Submit Solution (All 10 test cases: 5 open + 5 hidden)
  const handleSubmission = async (speakConfirmation = true) => {
    if (!question) return;
    setIsExecuting(true);
    setIsAnalyzingApproach(true);
    try {
      const fullReport = await runCode(language, code, question.id, question.test_cases);
      setExecReport(fullReport);

      // Analyze approach
      const analysis = await analyzeCode(
        question,
        code,
        language,
        fullReport,
        config.provider,
        config.api_key
      );
      setCodeAnalysis(analysis);

      const passMsg = `Submission processed. You passed ${fullReport.passed_cases} out of ${fullReport.total_cases} test cases.`;
      const followUp = analysis.follow_up_questions[0] || "Can you explain your complexity trade-offs?";
      if (speakConfirmation) {
        speakText(`${passMsg} ${followUp}`, compactPrompt(followUp));
      }
      addMessage("assistant", passMsg + " Let's discuss your approach: " + followUp);
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsExecuting(false);
      setIsAnalyzingApproach(false);
    }
  };

  const handleNextRound = () => {
    onComplete(chatMessages, {
      questionId: question?.id,
      code,
      language,
      execReport,
      codeAnalysis,
    });
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8F9FA] text-[#1A1A1A] overflow-hidden select-text">
      {/* Top Banner */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-gray-900 bg-gray-100 px-3 py-1 rounded-pill flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-brand-blue" />
            {roundName}
          </span>
          <span className="text-sm font-medium text-gray-700">{config.company}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue border border-blue-200 font-mono">
            {question?.difficulty || config.difficulty}
          </span>
        </div>

        {/* 25-Minute Live Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3.5 py-1 rounded-pill font-mono text-sm font-semibold border ${
            secondsLeft < 120
              ? "bg-red-50 text-red-600 border-red-300 animate-pulse"
              : secondsLeft < 300
              ? "bg-amber-50 text-amber-600 border-amber-300"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>

          {/* Hint Button */}
          <button
            onClick={handleRequestHint}
            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-pill flex items-center gap-1 font-medium transition-colors cursor-pointer"
            title="Ask AI interviewer for a subtle hint"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Hint</span>
          </button>

          {/* Prominent Skip Button */}
          <button
            onClick={() => setShowSkipModal(true)}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-pill flex items-center gap-1 font-medium transition-colors cursor-pointer"
            title="Unable to answer or want to skip this round"
          >
            <SkipForward className="w-3.5 h-3.5 text-gray-500" />
            <span>Skip Round</span>
          </button>

          <button
            onClick={handleNextRound}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>Proceed to Next Round</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 flex-col overflow-hidden">
      {/* Main Split: Problem | Editor and Test Cases */}
      <div
        className="flex min-h-0 overflow-hidden"
        style={{ flex: `0 0 calc(${mainAreaPercent}% - 3px)` }}
      >
        
        {/* Left Pane: Question Description (LeetCode Style) */}
        <div
          className="min-h-0 min-w-0 bg-white flex flex-col overflow-y-auto p-6"
          style={{ flex: `0 0 ${problemPanePercent}%` }}
        >
          {question ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-medium text-gray-900">
                  {question.title}
                </h2>
                <span className="text-xs font-mono text-gray-400">
                  Topic: {question.topic}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {question.companies.slice(0, 3).map((comp) => (
                  <span
                    key={comp}
                    className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    {comp}
                  </span>
                ))}
              </div>

              {/* Markdown Problem Description */}
              <div className="problem-markdown">
                <ReactMarkdown>{question.description}</ReactMarkdown>
              </div>

              {/* Code Analysis Summary (If Submitted) */}
              {codeAnalysis && (
                <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    AI Approach Analysis
                  </div>
                  <div className="text-xs text-gray-700">
                    <strong>Time Complexity:</strong> {codeAnalysis.time_complexity}
                  </div>
                  <div className="text-xs text-gray-700">
                    <strong>Space Complexity:</strong> {codeAnalysis.space_complexity}
                  </div>
                  <p className="text-xs text-gray-600 italic">
                    "{codeAnalysis.approach_summary}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Loading company question...
            </div>
          )}
        </div>

        <ResizeHandle
          axis="x"
          value={problemPanePercent}
          label="Resize problem and editor panels"
          onChange={(percent) => setProblemPanePercent(Math.max(25, Math.min(60, percent)))}
        />

        {/* Right Pane: Monaco Editor & Test Cases */}
        <div className="min-w-0 flex-1 flex flex-col bg-[#1C1C1E] overflow-hidden">
          
          {/* Editor Header: Language Switcher */}
          <div className="bg-[#1C1C1E] border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              {(['python', 'cpp', 'java'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`text-xs font-mono uppercase px-3 py-1 rounded transition-colors ${
                    language === lang
                      ? "bg-brand-blue text-white font-medium"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  {lang === 'cpp' ? 'C++' : lang}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunCode}
                disabled={isExecuting}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono px-3.5 py-1 rounded flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-brand-green" />
                <span>Run (5 Open Cases)</span>
              </button>

              <button
                onClick={() => handleSubmission(true)}
                disabled={isExecuting}
                className="bg-brand-green hover:bg-[#009b4d] text-white text-xs font-mono px-4 py-1 rounded flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit (10 Cases)</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 13,
                fontFamily: "'Google Sans Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>

          {/* Test Cases Panel */}
          <ResizeHandle
            axis="y"
            value={testPanePercent}
            reverse
            label="Resize editor and test cases panels"
            onChange={(percent) => setTestPanePercent(Math.max(15, Math.min(65, percent)))}
          />
          <div
            className="min-h-20 bg-[#18181A] flex flex-col shrink-0 text-white"
            style={{ flex: `0 0 ${testPanePercent}%` }}
          >
            {/* Test Case Tabs */}
            <div className="flex items-center gap-1 px-3 pt-2 bg-[#141416] border-b border-gray-800 overflow-x-auto">
              {Array.from({ length: 10 }).map((_, idx) => {
                const isHidden = idx >= 5;
                const result = execReport?.results[idx];
                const passed = result?.passed;

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`px-3 py-1 text-xs font-mono rounded-t flex items-center gap-1.5 transition-colors ${
                      activeTab === idx
                        ? "bg-[#18181A] text-white border-t-2 border-brand-blue"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {isHidden ? (
                      <Lock className="w-3 h-3 text-gray-500" />
                    ) : (
                      <Unlock className="w-3 h-3 text-gray-500" />
                    )}
                    <span>Case {idx + 1}</span>
                    {result && (
                      passed ? (
                        <CheckCircle2 className="w-3 h-3 text-brand-green" />
                      ) : (
                        <XCircle className="w-3 h-3 text-brand-red" />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* Test Case Details for Active Tab */}
            <div className="p-3 text-xs font-mono overflow-y-auto space-y-2 flex-1">
              {execReport ? (
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-gray-400">
                      Overall: {execReport.passed_cases}/{execReport.total_cases} Passed
                    </span>
                    {execReport.compilation_error && (
                      <span className="text-brand-red flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Compilation Error
                      </span>
                    )}
                  </div>

                  {execReport.compilation_error ? (
                    <pre className="p-2 bg-red-950/50 text-red-300 rounded border border-red-800 text-[11px] whitespace-pre-wrap">
                      {execReport.compilation_error}
                    </pre>
                  ) : (
                    execReport.results[activeTab] && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#121214] p-2 rounded border border-gray-800">
                          <span className="text-gray-500 block mb-1">Input:</span>
                          <span className="text-gray-300">{execReport.results[activeTab].input}</span>
                        </div>
                        <div className="bg-[#121214] p-2 rounded border border-gray-800">
                          <span className="text-gray-500 block mb-1">Expected Output:</span>
                          <span className="text-gray-300">{execReport.results[activeTab].expected}</span>
                        </div>
                        <div className="bg-[#121214] p-2 rounded border border-gray-800">
                          <span className="text-gray-500 block mb-1">Actual Output:</span>
                          <span className={execReport.results[activeTab].passed ? "text-brand-green" : "text-brand-red"}>
                            {execReport.results[activeTab].actual || "None"}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-gray-500 pt-3 text-center">
                  Click <strong>"Run"</strong> to test against 5 open cases, or <strong>"Submit"</strong> to evaluate all 10 test cases (including hidden).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ResizeHandle
        axis="y"
        value={mainAreaPercent}
        label="Resize workspace and voice panels"
        onChange={(percent) => setMainAreaPercent(Math.max(35, Math.min(85, percent)))}
      />

      {/* Bottom Voice Dialog & Live Interviewer Console */}
      <div className="min-h-24 flex-1 min-w-0 flex overflow-hidden bg-white shadow-lg">
        {/* Left: AI Voice Status & Orb */}
        <div
          className="min-w-0 flex items-center gap-3 px-4 py-3 overflow-hidden"
          style={{ flex: `0 0 ${interviewerPanePercent}%` }}
        >
          <VoiceOrb status={aiStatus} size="sm" caption="" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">
                AI Interviewer ({config.company})
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping" />
            </div>
            <p
              ref={aiCaptionRef}
              className="text-xs text-gray-600 max-w-xs max-h-12 overflow-y-auto whitespace-normal break-words"
            >
              {aiCaption}
            </p>
          </div>

          {aiStatus === 'speaking' && (
            <button
              onClick={handleInterrupt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-brand-red/10 text-brand-red border border-brand-red/30 hover:bg-brand-red/20 text-xs font-semibold transition-all shadow-sm cursor-pointer animate-pulse shrink-0 ml-1"
              title="Interrupt interviewer and speak"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Interrupt</span>
            </button>
          )}
        </div>

        <ResizeHandle
          axis="x"
          value={interviewerPanePercent}
          label="Resize interviewer and response panels"
          onChange={(percent) => setInterviewerPanePercent(Math.max(25, Math.min(55, percent)))}
        />

        {/* Center / Right: Expanded Candidate Response Dock with Multi-line Textarea */}
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5 px-4 py-2">
          {/* Top meta strip: context tag + STT recording status */}
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
                  Transcribing your audio with AI...
                </span>
              )}
              {!isListeningMic && !isTranscribing && (
                <span className="text-gray-400">
                  {userInputText.trim() ? "Edit transcript before sending" : "Speak via mic or type your explanation / questions"}
                </span>
              )}
            </div>

            {/* Test Status Indicator Badge (shows AI is aware of real execution) */}
            {execReport && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  execReport.all_passed
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : execReport.compilation_error
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {execReport.all_passed
                  ? "✓ Tests: All Passed (AI Aware)"
                  : execReport.compilation_error
                  ? "⚠️ Error in Code (AI Aware)"
                  : `Tests: ${execReport.passed_cases}/${execReport.total_cases} Passed (AI Aware)`}
              </span>
            )}
          </div>

          {/* Response Box with Mic and Action Controls */}
          <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-300 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 rounded-2xl p-2 transition-all">
            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={isListeningMic ? stopMicRecognition : startMicRecognition}
              disabled={isTranscribing}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isListeningMic
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md"
                  : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 shadow-sm"
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

            {/* Multi-line Textarea */}
            <textarea
              ref={responseTextareaRef}
              rows={2}
              value={userInputText}
              onChange={(e) => setUserInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && userInputText.trim()) {
                  e.preventDefault();
                  handleUserSpokenMessage(userInputText);
                }
              }}
              placeholder={
                isListeningMic
                  ? "Listening to speech... your words will appear here"
                  : "Explain your logic, time complexity, or ask the interviewer questions..."
              }
              className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none leading-relaxed py-1"
            />

            {/* Clear Button */}
            {userInputText.trim() && (
              <button
                type="button"
                onClick={() => setUserInputText("")}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                title="Clear text"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Send Button */}
            <button
              type="button"
              disabled={!userInputText.trim() || isTranscribing}
              onClick={() => {
                if (userInputText.trim()) {
                  handleUserSpokenMessage(userInputText);
                }
              }}
              className="px-4 py-2 bg-brand-blue hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
            <span>Press <kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200">Enter</kbd> to send, <kbd className="bg-gray-100 px-1 py-0.5 rounded border border-gray-200">Shift + Enter</kbd> for new line</span>
            {userInputText.length > 0 && <span>{userInputText.length} characters</span>}
          </div>
        </div>
      </div>
      </div>

      {/* Skip Round Confirmation Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <SkipForward className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Skip {roundName}?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Unable to answer or want to move ahead? You can skip this coding problem directly and advance to the next interview round.
              </p>
              <p className="text-[11px] text-gray-400">
                (Note: Unfinished rounds are excluded from final scoring, so this will not penalize other rounds.)
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  onSkip();
                }}
                className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Yes, Skip Round & Advance</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowSkipModal(false)}
                className="w-full btn-secondary text-xs py-2.5 cursor-pointer"
              >
                Continue Working on Problem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Live Webcam PiP */}
      <CameraFeed isPiP={true} />
    </div>
  );
};
