import React, { useState } from 'react';
import { LandingScreen } from './screens/LandingScreen';
import { SetupScreen } from './screens/SetupScreen';
import { DSARoundScreen } from './screens/DSARoundScreen';
import { TechnicalRoundScreen } from './screens/TechnicalRoundScreen';
import { HRRoundScreen } from './screens/HRRoundScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { Header } from './components/Header';
import { FullscreenGuard } from './components/FullscreenGuard';
import { InterviewConfig, RoundType, ChatMessage, FinalReport, NamedKey, PastInterview } from './types';
import { startInterviewSession, finishInterviewSession } from './services/api';
import { Sparkles, Loader2 } from 'lucide-react';

export function App() {
  const [currentStep, setCurrentStep] = useState<
    'landing' | 'setup' | 'dsa_1' | 'dsa_2' | 'technical' | 'hr' | 'generating' | 'results'
  >('landing');

  const [activeKey, setActiveKey] = useState<NamedKey | null>(null);
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [allTranscripts, setAllTranscripts] = useState<ChatMessage[]>([]);
  const [roundSubmissions, setRoundSubmissions] = useState<any[]>([]);
  const [completedRounds, setCompletedRounds] = useState<RoundType[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  // Proctoring anti-cheat warnings
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [isProctoringActive, setIsProctoringActive] = useState<boolean>(false);

  // 1. From Landing to Setup
  const handleStartSetup = (selectedKey: NamedKey | null) => {
    setActiveKey(selectedKey);
    setCurrentStep('setup');
  };

  // View past report from landing history
  const handleViewPastReport = (past: PastInterview) => {
    setConfig({
      candidate_name: past.candidate_name,
      dob: "",
      company: past.company,
      role: past.role,
      difficulty: past.difficulty as any,
      selected_rounds: ['dsa_1'],
      resume_text: "",
      detected_skills: [],
      additional_context: "",
      provider: 'gemini',
      api_key: "",
      remember_key: false
    });
    setFinalReport(past.scores);
    setAllTranscripts([]);
    setCurrentStep('results');
  };

  // 2. Start Interview from Setup
  const handleStartInterview = async (interviewConfig: InterviewConfig) => {
    setConfig(interviewConfig);
    setWarningsCount(0);
    setIsProctoringActive(true);
    setCompletedRounds([]);

    try {
      const sid = await startInterviewSession(interviewConfig);
      setSessionId(sid);
    } catch (e) {
      console.warn("Failed to register session with backend", e);
    }

    // Determine first round
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

  // Advance to next round or finish
  const advanceToNextRound = (current: RoundType, wasCompleted: boolean) => {
    if (!config) return;
    if (wasCompleted && !completedRounds.includes(current)) {
      setCompletedRounds((prev) => [...prev, current]);
    }

    const rounds = config.selected_rounds;
    const currentIndex = rounds.indexOf(current);

    if (currentIndex >= 0 && currentIndex < rounds.length - 1) {
      const nextRound = rounds[currentIndex + 1];
      setCurrentStep(nextRound as any);
    } else {
      // Finished all selected rounds
      const finalCompleted = wasCompleted && !completedRounds.includes(current)
        ? [...completedRounds, current]
        : completedRounds;
      handleFinishInterview(finalCompleted);
    }
  };

  // 3. Round Handlers
  const handleDSARoundComplete = (
    roundName: RoundType,
    transcript: ChatMessage[],
    submission: any
  ) => {
    setAllTranscripts((prev) => [...prev, ...transcript]);
    setRoundSubmissions((prev) => [...prev, { round: roundName, submission }]);
    advanceToNextRound(roundName, true);
  };

  const handleTechnicalComplete = (transcript: ChatMessage[]) => {
    setAllTranscripts((prev) => [...prev, ...transcript]);
    advanceToNextRound('technical', true);
  };

  const handleHRComplete = (transcript: ChatMessage[]) => {
    setAllTranscripts((prev) => [...prev, ...transcript]);
    advanceToNextRound('hr', true);
  };

  // 4. Finish & Generate Score Report
  const handleFinishInterview = async (finalCompletedList?: RoundType[]) => {
    setIsProctoringActive(false);
    setCurrentStep('generating');

    const effectiveCompleted = finalCompletedList || completedRounds;

    const interviewPayload = {
      candidate_name: config?.candidate_name,
      company: config?.company,
      role: config?.role,
      difficulty: config?.difficulty,
      selected_rounds: config?.selected_rounds,
      completed_rounds: effectiveCompleted,
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
        config?.api_key,
        config?.key_id
      );
      setFinalReport(report);
      setCurrentStep('results');
    } catch (err) {
      console.error(err);
      setCurrentStep('results');
    }
  };

  const handleProctoringTermination = () => {
    setIsProctoringActive(false);
    handleFinishInterview();
  };

  const handleRestart = () => {
    setAllTranscripts([]);
    setRoundSubmissions([]);
    setCompletedRounds([]);
    setFinalReport(null);
    setWarningsCount(0);
    setIsProctoringActive(false);
    setSessionId("");
    setConfig(null);
    setCurrentStep('landing');
  };


  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Brand Header */}
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

      {/* Proctoring Fullscreen / Focus Monitor */}
      <FullscreenGuard
        isActive={isProctoringActive}
        warningsCount={warningsCount}
        onWarning={(newCount) => setWarningsCount(newCount)}
        onTerminate={handleProctoringTermination}
      />

      {/* Screens */}
      <main className="flex-1 flex flex-col">
        {currentStep === 'landing' && (
          <LandingScreen
            onStartSetup={handleStartSetup}
            onViewPastReport={handleViewPastReport}
          />
        )}

        {currentStep === 'setup' && (
          <SetupScreen
            initialKey={activeKey}
            onBackToLanding={() => setCurrentStep('landing')}
            onStart={handleStartInterview}
          />
        )}

        {currentStep === 'dsa_1' && config && (
          <DSARoundScreen
            roundName="DSA Round 1"
            config={config}
            onComplete={(tr, sub) => handleDSARoundComplete('dsa_1', tr, sub)}
            onSkip={() => advanceToNextRound('dsa_1', false)}
          />
        )}

        {currentStep === 'dsa_2' && config && (
          <DSARoundScreen
            roundName="DSA Round 2"
            config={config}
            onComplete={(tr, sub) => handleDSARoundComplete('dsa_2', tr, sub)}
            onSkip={() => advanceToNextRound('dsa_2', false)}
          />
        )}

        {currentStep === 'technical' && config && (
          <TechnicalRoundScreen
            config={config}
            onComplete={handleTechnicalComplete}
            onSkip={() => advanceToNextRound('technical', false)}
          />
        )}

        {currentStep === 'hr' && config && (
          <HRRoundScreen
            config={config}
            onComplete={handleHRComplete}
            onSkip={() => advanceToNextRound('hr', false)}
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
            <p className="text-xs text-gray-500 max-w-md">
              Synthesizing algorithmic accuracy and responses strictly from your completed rounds.
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
