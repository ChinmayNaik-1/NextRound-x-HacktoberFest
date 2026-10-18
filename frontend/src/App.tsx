import React, { useState } from 'react';
import { SetupScreen } from './screens/SetupScreen';
import { DSARoundScreen } from './screens/DSARoundScreen';
import { TechnicalRoundScreen } from './screens/TechnicalRoundScreen';
import { HRRoundScreen } from './screens/HRRoundScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { Header } from './components/Header';
import { FullscreenGuard } from './components/FullscreenGuard';
import { InterviewConfig, RoundType, ChatMessage, FinalReport } from './types';
import { startInterviewSession, finishInterviewSession } from './services/api';
import { Sparkles, Loader2 } from 'lucide-react';

export function App() {
  const [currentStep, setCurrentStep] = useState<
    'setup' | 'dsa_1' | 'dsa_2' | 'technical' | 'hr' | 'generating' | 'results'
  >('setup');

  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [allTranscripts, setAllTranscripts] = useState<ChatMessage[]>([]);
  const [roundSubmissions, setRoundSubmissions] = useState<any[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  // Proctoring anti-cheat warnings
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [isProctoringActive, setIsProctoringActive] = useState<boolean>(false);

  // 1. Start Interview
  const handleStartInterview = async (interviewConfig: InterviewConfig) => {
    setConfig(interviewConfig);
    setWarningsCount(0);
    setIsProctoringActive(true);

    try {
      const sid = await startInterviewSession(interviewConfig);
      setSessionId(sid);
    } catch (e) {
      console.warn("Failed to register session with backend", e);
    }

    // Determine first round from selected rounds
    if (interviewConfig.selected_rounds.includes('dsa_1')) {
      setCurrentStep('dsa_1');
    } else if (interviewConfig.selected_rounds.includes('dsa_2')) {
      setCurrentStep('dsa_2');
    } else if (interviewConfig.selected_rounds.includes('technical')) {
      setCurrentStep('technical');
    } else if (interviewConfig.selected_rounds.includes('hr')) {
      setCurrentStep('hr');
    } else {
      setCurrentStep('dsa_1');
    }
  };

  // Helper to determine next round
  const advanceToNextRound = (current: RoundType) => {
    if (!config) return;
    const rounds = config.selected_rounds;
    const currentIndex = rounds.indexOf(current);

    if (currentIndex >= 0 && currentIndex < rounds.length - 1) {
      const nextRound = rounds[currentIndex + 1];
      setCurrentStep(nextRound as any);
    } else {
      // All selected rounds finished -> Generate assessment
      handleFinishInterview();
    }
  };

  // 2. Round Completion Handlers
  const handleDSARoundComplete = (
    roundName: RoundType,
    transcript: ChatMessage[],
    submission: any
  ) => {
    setAllTranscripts((prev) => [...prev, ...transcript]);
    setRoundSubmissions((prev) => [...prev, { round: roundName, submission }]);
    advanceToNextRound(roundName);
  };

  const handleTechnicalComplete = (transcript: ChatMessage[]) => {
    setAllTranscripts((prev) => [...prev, ...transcript]);
    advanceToNextRound('technical');
  };

  const handleHRComplete = (transcript: ChatMessage[]) => {
    setAllTranscripts((prev) => [...prev, ...transcript]);
    advanceToNextRound('hr');
  };

  // 3. Finish Interview & Generate Score Report
  const handleFinishInterview = async () => {
    setIsProctoringActive(false);
    setCurrentStep('generating');

    const interviewPayload = {
      candidate_name: config?.candidate_name,
      company: config?.company,
      role: config?.role,
      difficulty: config?.difficulty,
      selected_rounds: config?.selected_rounds,
      resume_text: config?.resume_text,
      transcripts: allTranscripts,
      submissions: roundSubmissions,
      warnings_count: warningsCount,
    };

    try {
      const report = await finishInterviewSession(
        sessionId,
        interviewPayload,
        config?.provider || 'gemini',
        config?.api_key
      );
      setFinalReport(report);
      setCurrentStep('results');
    } catch (err) {
      console.error(err);
      setCurrentStep('results');
    }
  };

  // 4. Force Termination due to 3 warnings
  const handleProctoringTermination = () => {
    setIsProctoringActive(false);
    handleFinishInterview();
  };

  const handleRestart = () => {
    setConfig(null);
    setAllTranscripts([]);
    setRoundSubmissions([]);
    setFinalReport(null);
    setWarningsCount(0);
    setIsProctoringActive(false);
    setCurrentStep('setup');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Brand Navigation Header */}
      <Header
        currentRound={
          currentStep === 'dsa_1'
            ? 'DSA Round 1'
            : currentStep === 'dsa_2'
            ? 'DSA Round 2'
            : currentStep === 'technical'
            ? 'Technical Round'
            : currentStep === 'hr'
            ? 'HR Round'
            : undefined
        }
        isProctoringActive={isProctoringActive}
        warningsCount={warningsCount}
      />

      {/* Proctoring Fullscreen / Escape Monitor */}
      <FullscreenGuard
        isActive={isProctoringActive}
        warningsCount={warningsCount}
        onWarning={(newCount) => setWarningsCount(newCount)}
        onTerminate={handleProctoringTermination}
      />

      {/* Screen Router */}
      <main className="flex-1 flex flex-col">
        {currentStep === 'setup' && (
          <SetupScreen onStart={handleStartInterview} />
        )}

        {currentStep === 'dsa_1' && config && (
          <DSARoundScreen
            roundName="DSA Round 1"
            config={config}
            onComplete={(tr, sub) => handleDSARoundComplete('dsa_1', tr, sub)}
            onSkip={() => advanceToNextRound('dsa_1')}
          />
        )}

        {currentStep === 'dsa_2' && config && (
          <DSARoundScreen
            roundName="DSA Round 2"
            config={config}
            onComplete={(tr, sub) => handleDSARoundComplete('dsa_2', tr, sub)}
            onSkip={() => advanceToNextRound('dsa_2')}
          />
        )}

        {currentStep === 'technical' && config && (
          <TechnicalRoundScreen
            config={config}
            onComplete={handleTechnicalComplete}
            onSkip={() => advanceToNextRound('technical')}
          />
        )}

        {currentStep === 'hr' && config && (
          <HRRoundScreen
            config={config}
            onComplete={handleHRComplete}
            onSkip={() => advanceToNextRound('hr')}
          />
        )}

        {/* Loading / Report Generation Transition */}
        {currentStep === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
              <Sparkles className="w-5 h-5 text-brand-yellow absolute" />
            </div>
            <h2 className="text-2xl font-medium text-gray-900">
              Evaluating Interview Performance...
            </h2>
            <p className="text-sm text-gray-500 max-w-md">
              Synthesizing algorithmic accuracy, system architecture breadth, and STAR behavioral answers into your scorecard.
            </p>
          </div>
        )}

        {currentStep === 'results' && finalReport && config && (
          <ResultsScreen
            report={finalReport}
            config={config}
            allTranscripts={allTranscripts}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}

export default App;
