import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Camera,
  CameraOff,
} from 'lucide-react';

export const CameraFeed: React.FC = () => {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const [stream, setStream] =
    useState<MediaStream | null>(null);

  const [failed, setFailed] =
    useState(false);

  const [cameraOff, setCameraOff] =
    useState(false);

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 320,
          height: 240,
          frameRate: 15,
        },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach(
            (t) => t.stop()
          );
          return;
        }

        acquired = s;
        setStream(s);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      acquired
        ?.getTracks()
        .forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (
      videoRef.current &&
      stream &&
      !cameraOff
    ) {
      videoRef.current.srcObject =
        stream;
    }
  }, [stream, cameraOff]);

  const toggleCamera = () => {
    stream
      ?.getVideoTracks()
      .forEach(
        (t) =>
          (t.enabled = cameraOff)
      );

    setCameraOff((v) => !v);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 w-56 bg-white rounded-card overflow-hidden shadow-elevated border border-gray-200">
      <div className="relative w-full aspect-[4/3] bg-gray-900 flex items-center justify-center">
        {!failed && !cameraOff ? (
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
          <div className="flex flex-col items-center p-4 text-center text-gray-400">
            <CameraOff className="w-8 h-8 mb-1.5 opacity-60" />

            <span className="text-xs">
              {failed
                ? 'Camera unavailable'
                : 'Camera off'}
            </span>
          </div>
        )}

        <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded-full text-[10px] text-white">
          Preview only · not recorded
        </div>

        {!failed && (
          <button
            onClick={toggleCamera}
            title={
              cameraOff
                ? 'Turn camera on'
                : 'Turn camera off'
            }
            className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
          >
            {cameraOff ? (
              <CameraOff className="w-3.5 h-3.5 text-brand-red" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};