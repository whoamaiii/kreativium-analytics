import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';

interface RoundSummaryProps {
  visible: boolean;
  target: string;
  timeMs: number;
  stabilityMs?: number;
  intensity?: number;
  confidence?: number; // 0..1
  actualProb?: number; // 0..1
  onContinue: () => void;
}

export function RoundSummaryCard({ visible, target, timeMs, stabilityMs, intensity, confidence, actualProb, onContinue }: RoundSummaryProps) {
  const { tCommon } = useTranslation();
  const calibError = typeof confidence === 'number' && typeof actualProb === 'number'
    ? Math.abs(confidence - actualProb)
    : undefined;
  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onContinue(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{String(tCommon('roundSummary.title'))}</DialogTitle>
          <DialogDescription>
            {String(tCommon('roundSummary.target'))}: <span className="font-medium">{target}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 text-sm gap-2">
          <div>{String(tCommon('roundSummary.time'))}: <span className="font-medium">{Math.round(timeMs)} ms</span></div>
          {typeof stabilityMs === 'number' && <div>{String(tCommon('roundSummary.stability'))}: <span className="font-medium">{Math.round(stabilityMs)} ms</span></div>}
          {typeof intensity === 'number' && <div>{String(tCommon('roundSummary.intensity'))}: <span className="font-medium">{Math.round((intensity ?? 0) * 100)}%</span></div>}
          {typeof confidence === 'number' && <div>{String(tCommon('roundSummary.confidence'))}: <span className="font-medium">{Math.round(confidence * 100)}%</span></div>}
          {typeof actualProb === 'number' && <div>{String(tCommon('roundSummary.actual'))}: <span className="font-medium">{Math.round(actualProb * 100)}%</span></div>}
          {typeof calibError === 'number' && <div>{String(tCommon('roundSummary.calibrationError'))}: <span className="font-medium">{Math.round(calibError * 100)}%</span></div>}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onContinue} variant="default">{String(tCommon('roundSummary.continue'))}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoundSummaryCard;



