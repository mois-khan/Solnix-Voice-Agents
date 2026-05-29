'use client';

import React from 'react';

export default function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-success animate-live-pulse" />
        {/* Solid dot */}
        <span className="relative h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="text-[12px] text-success font-medium">Live</span>

      <style>{`
        @keyframes live-pulse {
          0%   { transform: scale(1);   opacity: 1; }
          50%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .animate-live-pulse {
          animation: live-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </span>
  );
}
