import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react';

interface CameraFeedProps {
  isPiP?: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ isPiP = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startMedia() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true,
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.warn("Camera/Mic not accessible or denied:", err);
        setHasCamera(false);
      }
    }

    startMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const containerClasses = isPiP
    ? "fixed bottom-5 right-5 z-40 w-56 bg-white rounded-card overflow-hidden shadow-elevated border border-gray-200 transition-all hover:shadow-2xl"
    : "w-full aspect-video bg-gray-900 rounded-card overflow-hidden relative shadow-card border border-gray-200";

  return (
    <div className={containerClasses}>
      <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
        {hasCamera && !isCameraOff ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-gray-400">
            <CameraOff className="w-8 h-8 mb-1.5 opacity-60" />
            <span className="text-xs">Camera Feed Inactive</span>
          </div>
        )}

        {/* Live Proctoring Badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-[10px] font-medium text-white tracking-wider uppercase">
            Rec
          </span>
        </div>

        {/* Floating Quick Action Overlay */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full">
          <button
            onClick={toggleMic}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
            className="text-white hover:text-gray-300 transition-colors p-0.5"
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 text-brand-red" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleCamera}
            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            className="text-white hover:text-gray-300 transition-colors p-0.5"
          >
            {isCameraOff ? <CameraOff className="w-3.5 h-3.5 text-brand-red" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
