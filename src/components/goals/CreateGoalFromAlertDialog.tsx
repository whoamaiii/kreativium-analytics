import React, { useMemo, useState } from 'react';
import type { AlertEvent } from '@/lib/alerts/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/useToast';
import { storageService } from '@/lib/storage/storageService';
import { convertLegacyGoalToLocal } from '@/lib/adapters/legacyConverters';

type Props = {
  open: boolean;
  alert: AlertEvent | null;
  onOpenChange: (open: boolean) => void;
};

export const CreateGoalFromAlertDialog = ({ open, alert, onOpenChange }: Props) => {
  const now = new Date();
  const defaultTitle = useMemo(
    () => (alert ? `Goal: ${alert.kind.replace('_', ' ')}` : ''),
    [alert],
  );
  const [title, setTitle] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  React.useEffect(() => {
    if (alert) {
      setTitle(defaultTitle);
      setObjective(alert.metadata?.summary ? String(alert.metadata.summary) : '');
      setNotes('');
    }
  }, [alert, defaultTitle]);

  const handleCreate = () => {
    if (!alert) return;
    const now = new Date();
      const goal = {
        id: `${alert.id}:goal:${now.getTime()}`,
        studentId: alert.studentId,
      title: title || defaultTitle || 'New Goal',
      description: notes || (alert.metadata?.summary as string) || '',
      category: 'behavioral' as const,
      targetDate: new Date(now.getTime() + 90 * 24 * 3600_000),
      createdDate: now,
      updatedAt: now,
      status: 'in_progress' as const,
      measurableObjective: objective || 'Measurable change derived from alert context',
      currentProgress: 0,
      progress: 0,
      milestones: [],
      interventions: [],
      dataPoints: [],
    } as any;
    try {
      storageService.upsertGoal(convertLegacyGoalToLocal(goal));
      toast.success('Goal created from alert');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create goal');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Goal from Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
            />
          </div>
          <div>
            <label className="text-sm">Measurable Objective</label>
            <Textarea
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Describe the measurable objective"
            />
          </div>
          <div>
            <label className="text-sm">Notes</label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Goal</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGoalFromAlertDialog;
