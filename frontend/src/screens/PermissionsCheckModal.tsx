import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Play,
  Square,
  Sparkles,
  RefreshCw,
  VideoOff
} from 'lucide-react';
import { SpeechService } from '../services/speechService';

interface PermissionsCheckModalProps {
  onProceed: () => void;
  onCancel: () => void;
}

export const PermissionsCheckModal: React.FC<PermissionsCheckModalProps> = ({
  onProceed,
  onCancel,
}) => {
  // Device statuses
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'testing' | 'granted' | 'denied'>('idle');
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'granted' | 'denied'>('idle');
  const [speakerTested, setSpeakerTested] = useState<boolean>(false);

  // Audio level
  const [micLevel, setMicLevel] = useState<number>(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Audio playback test
  const [isRecordingPlayback, setIsRecordingPlayback] = useState<boolean>(false);
  const [playbackAudioUrl, setPlaybackAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Test Camera explicitly
  const testCamera = async () => {
    setCameraStatus('testing');
    try {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const vs = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 }
      });
      videoStreamRef.current = vs;
      setVideoStream(vs);
      setCameraStatus('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = vs;
      }
    } catch (err: any) {
      console.warn("Camera test failed:", err);
      setCameraStatus('denied');
    }
  };

  // 2. Test Microphone explicitly
  const testMicrophone = async () => {
    setMicStatus('testing');
    try {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const as = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = as;
      setAudioStream(as);
      setMicStatus('granted');

      // Start Audio Volume Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(as);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setMicLevel(Math.min(100, Math.round(avg * 1.8)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch (err: any) {
      console.warn("Microphone test failed:", err);
      setMicStatus('denied');
    }
  };

  // 3. Record a 3-second sample and play back to verify mic + headphones
  const handleRecordPlaybackSample = async () => {
    if (!audioStreamRef.current) {
      await testMicrophone();
    }
    try {
      const streamToUse = audioStreamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = streamToUse;
      setAudioStream(streamToUse);
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(streamToUse);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPlaybackAudioUrl(url);
        setIsRecordingPlayback(false);
      };

      recorder.start();
      setIsRecordingPlayback(true);

      // Auto stop after 3 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);
    } catch (e) {
      console.error(e);
      setIsRecordingPlayback(false);
    }
  };

  // 4. Test TTS Speaker
  const handleTestSpeaker = () => {
    SpeechService.speak(
      "Audio check passed. Your speakers and text to speech synthesizer are functioning properly.",
      () => setSpeakerTested(true),
      () => setSpeakerTested(true)
    );
  };

  const cleanupStreams = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // Auto-attempt initial permissions gracefully on modal open
  useEffect(() => {
    testMicrophone();
    testCamera();

    return () => {
      cleanupStreams();
    };
  }, []);

  const handleStart = async () => {
    cleanupStreams();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request error:", e);
    }
    onProceed();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-card max-w-xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-11 h-11 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-1">
            <Camera className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">
            Hardware & Device Check
          </h2>
          <p className="text-xs text-gray-500">
            Test and verify your microphone, speakers, and camera before starting the proctored interview.
          </p>
        </div>

        {/* 1. Camera Video Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-brand-blue" />
              Camera Video Feed
            </span>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono flex items-center gap-1 ${
                cameraStatus === 'granted'
                  ? "text-brand-green font-semibold"
                  : cameraStatus === 'testing'
                  ? "text-brand-blue"
                  : "text-amber-600"
              }`}>
                {cameraStatus === 'granted' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {cameraStatus === 'granted' ? "Camera Ready" : cameraStatus === 'testing' ? "Connecting..." : "Camera Optional (Not Detected)"}
              </span>

              <button
                type="button"
                onClick={testCamera}
                className="text-[11px] bg-white border border-gray-300 hover:bg-gray-100 px-2.5 py-1 rounded-pill flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-gray-500" />
                <span>Retest Camera</span>
              </button>
            </div>
          </div>

          <div className="w-full h-36 bg-gray-900 rounded-lg overflow-hidden relative flex items-center justify-center border border-gray-300">
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
              <div className="text-gray-400 text-xs text-center p-4 space-y-1">
                <VideoOff className="w-6 h-6 text-gray-500 mx-auto" />
                <p>Camera is optional for local self-view PiP.</p>
                <p className="text-[10px] text-gray-500">Video is never stored or uploaded externally.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Microphone & Audio Level Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
            <span className="flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-brand-green" />
              Microphone & Volume Level
            </span>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono flex items-center gap-1 ${
                micStatus === 'granted' ? "text-brand-green font-semibold" : "text-brand-red font-semibold"
              }`}>
                {micStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Microphone Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Click "Test Mic" to Grant Access
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={testMicrophone}
                className="text-[11px] bg-white border border-gray-300 hover:bg-gray-100 px-2.5 py-1 rounded-pill flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-gray-500" />
                <span>Test Mic</span>
              </button>
            </div>
          </div>

          {/* Animated Volume Meter */}
          <div className="space-y-1">
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden p-0.5 border border-gray-300">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  micLevel > 15 ? "bg-brand-green" : "bg-gray-400"
                }`}
                style={{ width: `${Math.max(4, micLevel)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Speak "Testing 1, 2, 3" to see green volume bar move</span>
              <span className="font-mono">{micLevel}%</span>
            </div>
          </div>

          {/* 3-Second Audio Recording Test & Playback */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleRecordPlaybackSample}
              disabled={isRecordingPlayback}
              className={`text-xs px-3 py-1.5 rounded-pill flex items-center gap-1.5 transition-all cursor-pointer ${
                isRecordingPlayback
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {isRecordingPlayback ? <Square className="w-3 h-3 fill-white" /> : <Mic className="w-3 h-3 text-brand-red" />}
              <span>{isRecordingPlayback ? "Recording 3s Sample..." : "Record 3s Mic Test"}</span>
            </button>

            {playbackAudioUrl && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">Play back test:</span>
                <audio controls src={playbackAudioUrl} className="h-7 w-48" />
              </div>
            )}
          </div>
        </div>

        {/* 3. Speaker / TTS Test */}
        <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs">
          <div className="flex items-center gap-2 text-gray-800">
            <Volume2 className="w-4 h-4 text-brand-blue" />
            <span>Test Text-to-Speech (TTS) Output</span>
          </div>

          <button
            type="button"
            onClick={handleTestSpeaker}
            className="bg-white border border-blue-200 hover:bg-blue-50 text-brand-blue font-medium px-3 py-1 rounded-pill flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 fill-brand-blue" />
            <span>{speakerTested ? "Play Again" : "Play Voice Sample"}</span>
          </button>
        </div>

        {/* Proctoring notice */}
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-900">Proctoring Focus Rule</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Exiting full-screen or switching tabs generates a focus warning. 2 warnings permitted; 3rd terminates the session.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-xs px-5 py-2.5 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>Enter Fullscreen Interview</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
