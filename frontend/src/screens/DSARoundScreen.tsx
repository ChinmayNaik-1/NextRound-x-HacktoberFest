import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
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
  HelpCircle
} from 'lucide-react';
import { InterviewConfig, Question, ExecutionReport, CodeAnalysis, ChatMessage } from '../types';
import { fetchCompanyQuestion, runCode, analyzeCode, sendInterviewChat } from '../services/api';
import { CameraFeed } from '../components/CameraFeed';
import { VoiceOrb } from '../components/VoiceOrb';
import { useTheme } from '../ThemeContext';

interface DSARoundScreenProps {
  roundName: string; // "DSA Round 1" or "DSA Round 2"
  config: InterviewConfig;
  onComplete: (transcript: ChatMessage[], codeSubmission: any) => void;
  onSkip: () => void;
}

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [userInputText, setUserInputText] = useState("");
  const [isAnalyzingApproach, setIsAnalyzingApproach] = useState(false);
  const [codeAnalysis, setCodeAnalysis] = useState<CodeAnalysis | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const speechRecognitionRef = useRef<any>(null);

  // 1. Fetch Company Question
  useEffect(() => {
    async function init() {
      const q = await fetchCompanyQuestion(config.company, config.difficulty);
      setQuestion(q);
      setCode(q.starter_code[language] || "");

      // Welcome voice message
      const greeting = `Welcome ${config.candidate_name} to your ${roundName} for ${config.company}. You have 25 minutes to review the problem and submit an optimal solution. Feel free to explain your approach aloud as you code.`;
      speakText(greeting);
      addMessage("assistant", greeting);

      // End greeting after 12 seconds
      setTimeout(() => {
        setIsGreetingPhase(false);
        setAiStatus('idle');
        setAiCaption("AI Interviewer is observing. Feel free to ask questions.");
      }, 12000);
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
    speakText("Time is up for this coding problem. Let's move on to analyzing your approach.");
    handleSubmission(false);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 3. Web Speech API (TTS & STT)
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
      setAiStatus('idle');
      setAiCaption("AI Interviewer is listening...");
    };
    window.speechSynthesis.speak(utterance);
  };

  const startMicRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser engine. You can type in the voice bar below!");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListeningMic(true);
      setAiStatus('listening');
      setAiCaption("Listening to your voice... Speak your thoughts aloud.");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          handleUserSpokenMessage(finalTranscript);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (err: any) => {
      console.warn("Speech recognition error", err);
      setIsListeningMic(false);
      setAiStatus('idle');
    };

    recognition.onend = () => {
      setIsListeningMic(false);
      setAiStatus('idle');
    };

    recognition.start();
    speechRecognitionRef.current = recognition;
  };

  const stopMicRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListeningMic(false);
      setAiStatus('idle');
    }
  };

  const handleUserSpokenMessage = async (text: string) => {
    if (!text.trim()) return;
    addMessage("user", text);
    setAiStatus('thinking');
    setAiCaption("AI is evaluating your input...");

    // Send to agent for interview turn
    const reply = await sendInterviewChat(
      'dsa_1',
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

  // 4. Request Hint from AI
  const handleRequestHint = async () => {
    if (!question) return;
    addMessage("user", "I'm a bit stuck on this problem. Could you provide a small hint or nudge in the right direction?");
    setAiStatus('thinking');
    setAiCaption("AI interviewer is formulating a helpful hint...");

    const reply = await sendInterviewChat(
      'dsa_1',
      config.company,
      config.role,
      [...chatMessages, { id: 'usr-hint', role: 'user', content: `Candidate is stuck on problem: ${question.title}. Give a concise, 1-2 sentence algorithmic hint or suggest what data structure or edge case to look into, without writing out the complete code.`, timestamp: '' }],
      config.resume_text,
      config.additional_context,
      config.provider,
      config.api_key
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
      if (speakConfirmation) {
        speakText(passMsg + " " + (analysis.follow_up_questions[0] || "Can you explain your complexity trade-offs?"));
      }
      addMessage("assistant", passMsg + " Let's discuss your approach: " + (analysis.follow_up_questions[0] || ""));
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
    <div className="flex flex-col h-screen bg-[#F8F9FA] text-[#1A1A1A] overflow-hidden select-text">
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

      {/* Main Split: Left (LeetCode Question) | Right (Monaco Editor & Test Cases) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Question Description (LeetCode Style) */}
        <div className="w-5/12 bg-white border-r border-gray-200 flex flex-col overflow-y-auto p-6">
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
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-3 font-sans">
                <div dangerouslySetInnerHTML={{ __html: question.description.replace(/\n/g, '<br/>') }} />
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

        {/* Right Pane: Monaco Editor & Test Cases */}
        <div className="w-7/12 flex flex-col bg-[#1C1C1E] overflow-hidden">
          
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
          <div className="flex-1 overflow-hidden">
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
          <div className="h-48 bg-[#18181A] border-t border-gray-800 flex flex-col shrink-0 text-white">
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

      {/* Bottom Voice Dialog & Live Interviewer Console */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg">
        {/* Left: AI Voice Status & Orb */}
        <div className="flex items-center gap-3">
          <VoiceOrb status={aiStatus} size="sm" caption="" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">
                AI Interviewer (Google)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping" />
            </div>
            <p className="text-xs text-gray-600 max-w-xl truncate">
              {aiCaption}
            </p>
          </div>
        </div>

        {/* Center: Live Spoken Transcript Input & Mic Toggle */}
        <div className="flex items-center gap-2 max-w-md w-full">
          <button
            onClick={isListeningMic ? stopMicRecognition : startMicRecognition}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium flex items-center gap-1.5 transition-all ${
              isListeningMic
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800"
            }`}
          >
            {isListeningMic ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-gray-500" />}
            <span>{isListeningMic ? "Mic Listening..." : "Enable Mic"}</span>
          </button>

          <input
            type="text"
            value={userInputText}
            onChange={(e) => setUserInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && userInputText.trim()) {
                handleUserSpokenMessage(userInputText);
                setUserInputText("");
              }
            }}
            placeholder="Speak or type your explanation to the interviewer..."
            className="flex-1 px-3 py-1.5 rounded-pill border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
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
