import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';

interface ConfidencePromptProps {
  visible: boolean;
  value: number; // 0..1
  onChange: (value: number) => void;
  onSubmit: () => void;
}

export function ConfidencePrompt({ visible, value, onChange, onSubmit }: ConfidencePromptProps) {
  const { tCommon } = useTranslation();
  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) onSubmit();
      }}
    >
      <DialogContent aria-describedby="confidence-desc">
        <DialogHeader>
          <DialogTitle>{String(tCommon('confidencePrompt.title'))}</DialogTitle>
          <DialogDescription id="confidence-desc">
            {String(tCommon('confidencePrompt.description'))}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(value * 100)}
            onChange={(e) => onChange(Math.max(0, Math.min(1, Number(e.target.value) / 100)))}
            className="w-full"
            aria-label={String(tCommon('confidencePrompt.ariaLabel'))}
          />
          <div className="text-sm">{Math.round(value * 100)}%</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={onSubmit}>
              {String(tCommon('confidencePrompt.submit'))}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfidencePrompt;
