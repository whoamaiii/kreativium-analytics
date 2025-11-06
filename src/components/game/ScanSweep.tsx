import React from 'react';

interface ScanSweepProps {
  active: boolean;
}

export function ScanSweep({ active }: ScanSweepProps) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
      <div className="absolute -inset-1 opacity-30 animate-[sweep_1.8s_linear_infinite] bg-[linear-gradient(120deg,transparent_35%,rgba(59,130,246,0.35)_50%,transparent_65%)]" />
      <style>{`
        @keyframes sweep {
          from { transform: translateX(-60%); }
          to { transform: translateX(60%); }
        }
      `}</style>
    </div>
  );
}




