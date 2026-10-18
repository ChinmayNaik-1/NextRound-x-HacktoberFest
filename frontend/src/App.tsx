import React, { useState } from 'react';
import { LandingScreen } from './screens/LandingScreen';
import { SetupScreen } from './screens/SetupScreen';
import { DSARoundScreen } from './screens/DSARoundScreen';
import { TechnicalRoundScreen } from './screens/TechnicalRoundScreen';
import { HRRoundScreen } from './screens/HRRoundScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { Header } from './components/Header';
import { FullscreenGuard } from './components/FullscreenGuard';
import {
  InterviewConfig,
  RoundType,
  ChatMessage,
  FinalReport,
  NamedKey,
  PastInterview
} from './types';
import {
  startInterviewSession,
  finishInterviewSession
} from './services/api';
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

  // Report generation error
  const [finishError, setFinishError] = useState<string | null>(null);

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
  const handleStartInterview = async (
    interviewConfig: InterviewConfig
  ) => {
    setConfig(interviewConfig);
    setWarningsCount(0);
    setIsProctoringActive(true);
    setCompletedRounds([]);
    setAllTranscripts([]);
    setRoundSubmissions([]);
    setFinalReport(null);
    setFinishError(null);

    try {
      const sid = await startInterviewSession(interviewConfig);
      setSessionId(sid);
    } catch (e) {
      console.warn(
        "Failed to register session with backend",
        e
      );
    }

    // Determine first round
    if (
      interviewConfig.selected_rounds.includes(
        'dsa_1'
      )
    ) {
      setCurrentStep('dsa_1');
    } else if (
      interviewConfig.selected_rounds.includes(
        'dsa_2'
      )
    ) {
      setCurrentStep('dsa_2');
    } else if (
      interviewConfig.selected_rounds.includes(
        'technical'
      )
    ) {
      setCurrentStep('technical');
    } else if (
      interviewConfig.selected_rounds.includes(
        'hr'
      )
    ) {
      setCurrentStep('hr');
    } else {
      setCurrentStep('dsa_1');
    }
  };

  // Advance to next round or finish
  const advanceToNextRound = (
    current: RoundType,
    wasCompleted: boolean,
    latestTranscript?: ChatMessage[],
    latestSubmission?: any
  ) => {
    if (!config) return;

    /*
     * React state updates are asynchronous.
     *
     * Therefore, when the final round finishes, we cannot
     * immediately rely on allTranscripts / roundSubmissions
     * containing the latest round.
     *
     * Build the final values explicitly here.
     */

    const nextCompletedRounds =
      wasCompleted &&
      !completedRounds.includes(current)
        ? [...completedRounds, current]
        : completedRounds;

    const nextTranscripts = latestTranscript
      ? [...allTranscripts, ...latestTranscript]
      : allTranscripts;

    const nextSubmissions = latestSubmission
      ? [
          ...roundSubmissions,
          {
            round: current,
            submission: latestSubmission
          }
        ]
      : roundSubmissions;

    setCompletedRounds(nextCompletedRounds);

    if (latestTranscript) {
      setAllTranscripts(nextTranscripts);
    }

    if (latestSubmission) {
      setRoundSubmissions(nextSubmissions);
    }

    const rounds = config.selected_rounds;
    const currentIndex = rounds.indexOf(current);

    if (
      currentIndex >= 0 &&
      currentIndex < rounds.length - 1
    ) {
      const nextRound = rounds[currentIndex + 1];

      setCurrentStep(
        nextRound as
          | 'dsa_1'
          | 'dsa_2'
          | 'technical'
          | 'hr'
      );

      return;
    }

    // Finished all selected rounds
    handleFinishInterview(
      nextCompletedRounds,
      nextTranscripts,
      nextSubmissions
    );
  };

  // 3. Round Handlers
  const handleDSARoundComplete = (
    roundName: RoundType,
    transcript: ChatMessage[],
    submission: any
  ) => {
    advanceToNextRound(
      roundName,
      true,
      transcript,
      submission
    );
  };

  const handleTechnicalComplete = (
    transcript: ChatMessage[]
  ) => {
    advanceToNextRound(
      'technical',
      true,
      transcript
    );
  };

  const handleHRComplete = (
    transcript: ChatMessage[]
  ) => {
    advanceToNextRound(
      'hr',
      true,
      transcript
    );
  };

  // 4. Finish & Generate Score Report
  const handleFinishInterview = async (
    finalCompletedList?: RoundType[],
    finalTranscripts?: ChatMessage[],
    finalSubmissions?: any[]
  ) => {
    setIsProctoringActive(false);
    setFinishError(null);
    setCurrentStep('generating');

    const effectiveCompleted =
      finalCompletedList || completedRounds;

    const effectiveTranscripts =
      finalTranscripts || allTranscripts;

    const effectiveSubmissions =
      finalSubmissions || roundSubmissions;

    const interviewPayload = {
      candidate_name: config?.candidate_name,
      company: config?.company,
      role: config?.role,
      difficulty: config?.difficulty,
      selected_rounds: config?.selected_rounds,
      completed_rounds: effectiveCompleted,
      resume_text: config?.resume_text,
      transcripts: effectiveTranscripts,
      submissions: effectiveSubmissions,
      warnings_count: warningsCount
    };

    console.log(
      "FINISH INTERVIEW PAYLOAD:",
      interviewPayload
    );

    try {
      const report =
        await finishInterviewSession(
          sessionId,
          interviewPayload,
          config?.provider || 'gemini',
          config?.api_key,
          config?.key_id
        );

      console.log(
        "FINAL REPORT:",
        report
      );

      setFinalReport(report);
      setFinishError(null);
      setCurrentStep('results');

    } catch (err: any) {
      console.error(
        "FAILED TO GENERATE FINAL REPORT:",
        err
      );

      const message =
        err?.message ||
        "Failed to generate the interview report.";

      setFinishError(message);

      /*
       * DO NOT set currentStep('results') here.
       *
       * ResultsScreen requires finalReport.
       * If finalReport is null, that would produce
       * a blank screen.
       */
      setCurrentStep('generating');
    }
  };

  const handleProctoringTermination = () => {
    setIsProctoringActive(false);
    handleFinishInterview();
  };

  const handleRestart = () => {
    setConfig(null);
    setAllTranscripts([]);
    setRoundSubmissions([]);
    setCompletedRounds([]);
    setFinalReport(null);
    setFinishError(null);
    setWarningsCount(0);
    setIsProctoringActive(false);
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
        isProctoringActive={
          isProctoringActive
        }
        warningsCount={warningsCount}
      />

      {/* Proctoring Fullscreen / Focus Monitor */}
      <FullscreenGuard
        isActive={isProctoringActive}
        warningsCount={warningsCount}
        onWarning={(newCount) =>
          setWarningsCount(newCount)
        }
        onTerminate={
          handleProctoringTermination
        }
      />

      {/* Screens */}
      <main className="flex-1 flex flex-col">

        {/* Landing */}
        {currentStep === 'landing' && (
          <LandingScreen
            onStartSetup={
              handleStartSetup
            }
            onViewPastReport={
              handleViewPastReport
            }
          />
        )}

        {/* Setup */}
        {currentStep === 'setup' && (
          <SetupScreen
            initialKey={activeKey}
            onBackToLanding={() =>
              setCurrentStep('landing')
            }
            onStart={
              handleStartInterview
            }
          />
        )}

        {/* DSA Round 1 */}
        {currentStep === 'dsa_1' &&
          config && (
            <DSARoundScreen
              roundName="DSA Round 1"
              config={config}
              onComplete={(
                tr,
                sub
              ) =>
                handleDSARoundComplete(
                  'dsa_1',
                  tr,
                  sub
                )
              }
              onSkip={() =>
                advanceToNextRound(
                  'dsa_1',
                  false
                )
              }
            />
          )}

        {/* DSA Round 2 */}
        {currentStep === 'dsa_2' &&
          config && (
            <DSARoundScreen
              roundName="DSA Round 2"
              config={config}
              onComplete={(
                tr,
                sub
              ) =>
                handleDSARoundComplete(
                  'dsa_2',
                  tr,
                  sub
                )
              }
              onSkip={() =>
                advanceToNextRound(
                  'dsa_2',
                  false
                )
              }
            />
          )}

        {/* Technical Round */}
        {currentStep === 'technical' &&
          config && (
            <TechnicalRoundScreen
              config={config}
              onComplete={
                handleTechnicalComplete
              }
              onSkip={() =>
                advanceToNextRound(
                  'technical',
                  false
                )
              }
            />
          )}

        {/* HR Round */}
        {currentStep === 'hr' &&
          config && (
            <HRRoundScreen
              config={config}
              onComplete={
                handleHRComplete
              }
              onSkip={() =>
                advanceToNextRound(
                  'hr',
                  false
                )
              }
            />
          )}

        {/* Loading / Report Generation / Error */}
        {currentStep === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">

            {finishError ? (
              <>
                <div className="text-red-500 text-4xl">
                  ⚠
                </div>

                <h2 className="text-2xl font-medium text-gray-900">
                  Report Generation Failed
                </h2>

                <p className="text-sm text-gray-500 max-w-lg">
                  {finishError}
                </p>

                <button
                  onClick={() =>
                    handleFinishInterview()
                  }
                  className="btn-primary px-6 py-2.5"
                >
                  Try Again
                </button>

                <button
                  onClick={handleRestart}
                  className="btn-secondary px-6 py-2.5"
                >
                  Start Over
                </button>
              </>
            ) : (
              <>
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
              </>
            )}

          </div>
        )}

        {/* Results */}
        {currentStep === 'results' &&
          finalReport &&
          config && (
            <ResultsScreen
              report={finalReport}
              config={config}
              allTranscripts={
                allTranscripts
              }
              onRestart={
                handleRestart
              }
            />
          )}

      </main>
    </div>
  );
}

export default App;