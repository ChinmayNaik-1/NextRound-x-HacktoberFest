import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, Maximize2 } from 'lucide-react';

interface FullscreenGuardProps {
  isActive: boolean;
  warningsCount: number;
  onWarning: (newCount: number) => void;
  onTerminate: () => void;
}

export const FullscreenGuard: React.FC<FullscreenGuardProps> = ({
  isActive,
  warningsCount,
  onWarning,
  onTerminate,
}) => {
  const [showWarningModal, setShowWarningModal] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Request fullscreen utility
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setShowWarningModal(null);
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const handleFocusLoss = () => {
      const nextCount = warningsCount + 1;
      onWarning(nextCount);
      if (nextCount >= 3) {
        setShowWarningModal(3);
        onTerminate();
      } else {
        setShowWarningModal(nextCount);
      }
    };

    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && isActive) {
        handleFocusLoss();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        handleFocusLoss();
      }
    };

    const handleWindowBlur = () => {
      if (isActive) {
        handleFocusLoss();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.altKey && e.key === "Tab")) {
        e.preventDefault();
        handleFocusLoss();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, warningsCount, onWarning, onTerminate]);

  if (!isActive) return null;

  return (
    <>
      {/* Floating reminder if not in fullscreen */}
      {!isFullscreen && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-pill shadow-elevated flex items-center gap-3 border border-gray-700 animate-bounce">
          <ShieldAlert className="w-4 h-4 text-brand-yellow" />
          <span className="text-xs font-medium">Full-screen is required for this interview</span>
          <button
            onClick={enterFullscreen}
            className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-pill hover:bg-gray-100 flex items-center gap-1"
          >
            <Maximize2 className="w-3 h-3" />
            Enter Fullscreen
          </button>
        </div>
      )}

      {/* Warning Modals */}
      {showWarningModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            {showWarningModal === 1 && (
              <>
                <div className="w-14 h-14 rounded-full bg-[#FEF7E0] text-[#B06000] flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Warning 1 of 3: Focus Lost
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Tab switching, minimizing, or exiting full-screen mode is recorded by the proctoring monitor. Please remain focused on the interview window.
                </p>
                <button
                  onClick={enterFullscreen}
                  className="w-full btn-primary"
                >
                  Return to Interview
                </button>
              </>
            )}

            {showWarningModal === 2 && (
              <>
                <div className="w-14 h-14 rounded-full bg-[#FCE8E6] text-[#C5221F] flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-xl font-medium text-red-600 mb-2">
                  Warning 2 of 3: Second Violation
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  You have triggered a 2nd focus escape warning. <strong className="text-red-700 font-semibold">One more violation will immediately terminate your interview and lock your submission.</strong>
                </p>
                <button
                  onClick={enterFullscreen}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-pill transition-all"
                >
                  I Understand, Resume Interview
                </button>
              </>
            )}

            {showWarningModal >= 3 && (
              <>
                <div className="w-14 h-14 rounded-full bg-red-700 text-white flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-red-700 mb-2">
                  Interview Terminated (3/3)
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  You have exceeded the maximum allowable proctoring violations. Your session has ended, and your results are being generated.
                </p>
                <button
                  onClick={() => {
                    setShowWarningModal(null);
                    onTerminate();
                  }}
                  className="w-full bg-[#1A1A1A] text-white font-medium py-2.5 rounded-pill"
                >
                  View Final Evaluation Report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
