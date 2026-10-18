import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AlertTriangle,
  ShieldAlert,
  Maximize2,
  Loader2,
} from 'lucide-react';

interface FullscreenGuardProps {
  isActive: boolean;
  warningsCount: number;
  onWarning: (newCount: number) => void;
  onTerminate: () => void;
}

const MAX_WARNINGS = 3;
const COOLDOWN_MS = 1500;
const GRACE_MS = 4000;

export const FullscreenGuard: React.FC<
  FullscreenGuardProps
> = ({
  isActive,
  warningsCount,
  onWarning,
  onTerminate,
}) => {
  const [modal, setModal] =
    useState<number | null>(null);

  const [isFullscreen, setIsFullscreen] =
    useState(!!document.fullscreenElement);

  const countRef =
    useRef(warningsCount);

  const cooldownUntil =
    useRef(0);

  const graceUntil =
    useRef(0);

  const terminated =
    useRef(false);

  const onWarningRef =
    useRef(onWarning);

  const onTerminateRef =
    useRef(onTerminate);

  onWarningRef.current =
    onWarning;

  onTerminateRef.current =
    onTerminate;

  useEffect(() => {
    countRef.current =
      warningsCount;

    if (warningsCount === 0) {
      terminated.current = false;
    }
  }, [warningsCount]);

  const enterFullscreen =
    useCallback(async () => {
      try {
        graceUntil.current =
          Date.now() + 1500;

        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }

        setModal((m) =>
          m !== null &&
          m < MAX_WARNINGS
            ? null
            : m
        );
      } catch (e) {
        console.warn(
          'Fullscreen request failed',
          e
        );
      }
    }, []);

  useEffect(() => {
    if (!isActive) return;

    graceUntil.current =
      Date.now() + GRACE_MS;

    const violation = () => {
      const now = Date.now();

      if (
        terminated.current ||
        now < cooldownUntil.current ||
        now < graceUntil.current
      ) {
        return;
      }

      cooldownUntil.current =
        now + COOLDOWN_MS;

      const next =
        countRef.current + 1;

      countRef.current = next;

      onWarningRef.current(next);

      if (next >= MAX_WARNINGS) {
        terminated.current = true;
        setModal(MAX_WARNINGS);
        onTerminateRef.current();
      } else {
        setModal(next);
      }
    };

    const onFsChange = () => {
      const fs =
        !!document.fullscreenElement;

      setIsFullscreen(fs);

      if (!fs) {
        violation();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        violation();
      }
    };

    const onBlur = () => violation();

    document.addEventListener(
      'fullscreenchange',
      onFsChange
    );

    document.addEventListener(
      'visibilitychange',
      onVisibility
    );

    window.addEventListener(
      'blur',
      onBlur
    );

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        onFsChange
      );

      document.removeEventListener(
        'visibilitychange',
        onVisibility
      );

      window.removeEventListener(
        'blur',
        onBlur
      );
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      {!isFullscreen &&
        modal === null && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-pill shadow-elevated flex items-center gap-3 border border-gray-700">
            <ShieldAlert className="w-4 h-4 text-brand-yellow" />

            <span className="text-xs font-medium">
              Full screen is required for this interview
            </span>

            <button
              onClick={enterFullscreen}
              className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-pill hover:bg-gray-100 flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              Enter full screen
            </button>
          </div>
        )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center">
            {modal === 1 && (
              <>
                <div className="w-14 h-14 rounded-full bg-[#FEF7E0] text-[#B06000] flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Warning 1 of 3: you left the interview
                </h3>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Switching tabs, minimizing, or leaving full screen is recorded. Stay on this window until the interview ends.
                </p>

                <button
                  onClick={enterFullscreen}
                  className="w-full btn-primary"
                >
                  Return to interview
                </button>
              </>
            )}

            {modal === 2 && (
              <>
                <div className="w-14 h-14 rounded-full bg-[#FCE8E6] text-[#C5221F] flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-medium text-red-600 mb-2">
                  Warning 2 of 3
                </h3>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  <strong className="text-red-700 font-semibold">
                    One more violation ends your interview
                  </strong>{' '}
                  and locks your submission.
                </p>

                <button
                  onClick={enterFullscreen}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-pill"
                >
                  Resume interview
                </button>
              </>
            )}

            {modal >= MAX_WARNINGS && (
              <>
                <div className="w-14 h-14 rounded-full bg-red-700 text-white flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-semibold text-red-700 mb-2">
                  Interview ended (3 of 3)
                </h3>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  You reached the limit of focus violations. We are scoring what you completed so far.
                </p>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating your report…
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};