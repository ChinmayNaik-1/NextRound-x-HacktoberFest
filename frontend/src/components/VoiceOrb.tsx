import React from 'react';
import { Volume2, Mic, Sparkles } from 'lucide-react';

interface VoiceOrbProps {
  status: 'idle' | 'listening' | 'speaking' | 'thinking';
  caption?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  status,
  caption,
  size = 'md',
}) => {
  const sizeMap = {
    sm: "w-16 h-16",
    md: "w-28 h-28",
    lg: "w-40 h-40",
  };

  const statusColors = {
    idle: "from-[#3186FF] to-[#749BFF]",
    listening: "from-[#00B95C] to-[#34A853]",
    speaking: "from-[#3186FF] via-[#749BFF] to-[#FC413D]",
    thinking: "from-[#FBBC04] via-[#FFE432] to-[#3186FF]",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer ambient glow rings */}
        {status === 'speaking' && (
          <>
            <div className={`absolute ${sizeMap[size]} rounded-full bg-brand-blue/20 animate-ping duration-1000`} />
            <div className={`absolute ${sizeMap[size]} scale-125 rounded-full bg-brand-purple/15 animate-pulse`} />
          </>
        )}
        {status === 'listening' && (
          <div className={`absolute ${sizeMap[size]} scale-115 rounded-full bg-brand-green/20 animate-pulse`} />
        )}

        {/* Center Orb */}
        <div
          className={`${sizeMap[size]} rounded-full bg-gradient-to-tr ${statusColors[status]} shadow-glowBlue flex items-center justify-center text-white transition-all duration-500 ${
            status === 'speaking' ? 'orb-speaking' : status === 'listening' ? 'orb-listening' : 'scale-95'
          }`}
        >
          {status === 'speaking' && <Volume2 className="w-8 h-8 drop-shadow-md animate-pulse" />}
          {status === 'listening' && <Mic className="w-8 h-8 drop-shadow-md animate-bounce" />}
          {status === 'thinking' && <Sparkles className="w-8 h-8 drop-shadow-md animate-spin" />}
          {status === 'idle' && (
            <div className="w-4 h-4 rounded-full bg-white/80 animate-ping" />
          )}
        </div>
      </div>

      {/* State Caption */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-800">
          {caption || (
            status === 'speaking'
              ? "Interviewer is speaking..."
              : status === 'listening'
              ? "Listening to you... (Speak naturally)"
              : status === 'thinking'
              ? "Analyzing your response..."
              : "AI Ready"
          )}
        </p>
        <span className="text-xs text-gray-400">
          {status === 'listening' ? "Microphone active" : "Voice synthesizer active"}
        </span>
      </div>
    </div>
  );
};
