import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronUp, ArrowUpDown, Video } from 'lucide-react';

interface CameraFeedProps {
  isPiP?: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ isPiP = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startMedia() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.warn("Camera not accessible or denied (optional preview only):", err);
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

  // When unminimizing, reconnect stream to video element
  useEffect(() => {
    if (!isMinimized && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isMinimized, stream]);

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const togglePosition = () => {
    setPosition((prev) => (prev === 'top' ? 'bottom' : 'top'));
  };

  if (!isPiP) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-card overflow-hidden relative shadow-card border border-gray-200">
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
        </div>
      </div>
    );
  }

  // Minimized Pill representation (Never blocks anything)
  if (isMinimized) {
    const pillPosition = position === 'top' ? 'top-16 right-6' : 'bottom-28 right-6';
    return (
      <div className={`fixed ${pillPosition} z-40 transition-all`}>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="bg-gray-900/90 hover:bg-black text-white px-3 py-1.5 rounded-full shadow-lg border border-gray-700/80 flex items-center gap-2 text-xs backdrop-blur-md transition-all cursor-pointer group"
          title="Click to expand camera preview"
        >
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-[11px] font-medium text-gray-200 group-hover:text-white">
            {isCameraOff ? "Camera Off" : "Live Camera"}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    );
  }

  // Expanded PiP floating window
  // Placed at top-20 right-6 or bottom-28 right-6 (safely above the bottom response console)
  const posClass = position === 'top' ? 'top-20 right-6' : 'bottom-28 right-6';

  return (
    <div
      className={`fixed ${posClass} z-40 w-52 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700/80 transition-all`}
    >
      {/* Top Controls Bar */}
      <div className="bg-black/70 backdrop-blur-sm px-2.5 py-1.5 flex items-center justify-between border-b border-gray-800 text-white">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-200">
            Preview
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mute / Unmute Camera */}
          <button
            type="button"
            onClick={toggleCamera}
            title={isCameraOff ? "Enable Camera" : "Turn Off Camera"}
            className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {isCameraOff ? <CameraOff className="w-3 h-3 text-brand-red" /> : <Camera className="w-3 h-3" />}
          </button>

          {/* Toggle Position Top / Bottom */}
          <button
            type="button"
            onClick={togglePosition}
            title={position === 'top' ? "Move to Bottom" : "Move to Top"}
            className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3" />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize Camera to Pill"
            className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full aspect-video bg-gray-950 flex items-center justify-center">
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
          <div className="flex flex-col items-center justify-center p-3 text-center text-gray-400">
            <CameraOff className="w-6 h-6 mb-1 opacity-60 text-brand-red" />
            <span className="text-[10px] text-gray-400">Camera Inactive</span>
          </div>
        )}
      </div>
    </div>
  );
};
