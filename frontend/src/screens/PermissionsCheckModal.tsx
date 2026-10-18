import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Mic,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Maximize2,
} from 'lucide-react';

interface Props {
  onProceed: () => void;
  onCancel: () => void;
}

export const PermissionsCheckModal: React.FC<Props> = ({
  onProceed,
  onCancel,
}) => {
  const [status, setStatus] = useState<
    'pending' | 'granted' | 'denied'
  >('pending');

  const [micLevel, setMicLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;

    setStatus('pending');

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 320,
          height: 240,
        },
        audio: true,
      })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        stream = mediaStream;

        setStatus('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const AudioContextClass =
          window.AudioContext ||
          (window as any).webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        audioContext = new AudioContextClass();

        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 64;

        const source =
          audioContext.createMediaStreamSource(mediaStream);

        source.connect(analyser);

        const data = new Uint8Array(
          analyser.frequencyBinCount,
        );

        const updateMicLevel = () => {
          analyser.getByteFrequencyData(data);

          const average =
            data.reduce(
              (sum, value) => sum + value,
              0,
            ) / data.length;

          setMicLevel(
            Math.min(
              100,
              Math.round(average * 1.5),
            ),
          );

          animationFrame =
            requestAnimationFrame(updateMicLevel);
        };

        updateMicLevel();
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('denied');
        }
      });

    return () => {
      cancelled = true;

      cancelAnimationFrame(animationFrame);

      stream
        ?.getTracks()
        .forEach((track) => track.stop());

      audioContext?.close().catch(() => {});
    };
  }, [attempt]);

  const handleStart = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request:', error);
    }

    onProceed();
  };

  const permissionsGranted = status === 'granted';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-card max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-medium text-gray-900">
            Check your camera and microphone
          </h2>

          <p className="text-xs text-gray-500">
            The interview runs full screen. Your camera
            shows as a preview and is not recorded.
          </p>
        </div>

        {/* Camera */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-brand-blue" />
              Camera
            </span>

            <span
              className={`flex items-center gap-1 text-[11px] ${
                permissionsGranted
                  ? 'text-brand-green'
                  : 'text-brand-red'
              }`}
            >
              {permissionsGranted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Working
                </>
              ) : status === 'pending' ? (
                'Waiting for permission…'
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Blocked or unavailable
                </>
              )}
            </span>
          </div>

          <div className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
            {permissionsGranted ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  transform: 'scaleX(-1)',
                }}
              />
            ) : (
              <p className="text-gray-400 text-xs text-center p-4">
                Allow camera and microphone access in the
                browser prompt.
              </p>
            )}
          </div>
        </div>

        {/* Microphone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-brand-green" />
              Microphone
            </span>

            <span className="text-[11px] text-gray-500">
              {permissionsGranted
                ? `Level ${micLevel}%`
                : '—'}
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-75"
              style={{
                width: `${micLevel}%`,
              }}
            />
          </div>

          <span className="text-[11px] text-gray-400 block text-right">
            Say “testing, one two three” and watch the bar
            move.
          </span>
        </div>

        {/* Warning */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />

          <div>
            <strong>Focus rule:</strong> leaving full
            screen or switching tabs counts as a warning.
            The third one ends the interview.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onCancel}
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </button>

          {permissionsGranted ? (
            <button
              onClick={handleStart}
              className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Start in full screen
            </button>
          ) : (
            <button
              onClick={() =>
                setAttempt((value) => value + 1)
              }
              className="btn-primary text-xs px-6 py-2.5"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};