import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, ShieldAlert, CheckCircle2, AlertCircle, Maximize2 } from 'lucide-react';

interface PermissionsCheckModalProps {
  onProceed: () => void;
  onCancel: () => void;
}

export const PermissionsCheckModal: React.FC<PermissionsCheckModalProps> = ({
  onProceed,
  onCancel,
}) => {
  const [cameraStatus, setCameraStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [micStatus, setMicStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Request real Camera & Mic permissions
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function checkMedia() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: true,
        });
        localStream = s;
        setStream(s);
        setCameraStatus('granted');
        setMicStatus('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        // Measure live microphone audio volume
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(s);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round(avg * 1.5)));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (err: any) {
        console.warn("Permission error:", err);
        setCameraStatus('denied');
        setMicStatus('denied');
      }
    }

    checkMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleStart = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request:", e);
    }
    onProceed();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-card max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6">
        
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">
            Hardware & Proctoring Check
          </h2>
          <p className="text-xs text-gray-500">
            Verify your camera and microphone feed before entering the full-screen proctored session.
          </p>
        </div>

        {/* Live Camera Feed Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-brand-blue" />
              Camera Video Feed
            </span>
            <span className={`flex items-center gap-1 text-[11px] font-mono ${
              cameraStatus === 'granted' ? "text-brand-green" : "text-brand-red"
            }`}>
              {cameraStatus === 'granted' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Permission Granted
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Camera Blocked / Unavailable
                </>
              )}
            </span>
          </div>

          <div className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden relative border border-gray-200 flex items-center justify-center">
            {cameraStatus === 'granted' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="text-gray-400 text-xs text-center p-4">
                Please allow camera access in the browser/OS prompt to enable proctoring.
              </div>
            )}
          </div>
        </div>

        {/* Live Microphone Audio Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-brand-green" />
              Microphone Audio Signal
            </span>
            <span className={`flex items-center gap-1 text-[11px] font-mono ${
              micStatus === 'granted' ? "text-brand-green" : "text-brand-red"
            }`}>
              {micStatus === 'granted' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Audio Signal Active ({micLevel}%)
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Microphone Blocked
                </>
              )}
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-75"
              style={{ width: `${micLevel}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 block text-right">
            Say "Testing 1, 2, 3" to test volume response
          </span>
        </div>

        {/* Anti-cheat Fullscreen Policy Reminder */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong>Proctoring Notice:</strong> Exiting full screen or switching tabs triggers a warning (2 warnings allowed; 3rd terminates the session).
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

          <button
            onClick={handleStart}
            className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Enter Fullscreen Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
