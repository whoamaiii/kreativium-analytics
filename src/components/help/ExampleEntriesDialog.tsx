/**
 * Example Entries Dialog Wrapper
 *
 * Reusable dialog component that displays example tracking entries.
 * Can be triggered from Help menus, Settings, or as a standalone button.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExampleEntries } from './ExampleEntries';

interface ExampleEntriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExampleEntriesDialog: React.FC<ExampleEntriesDialogProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Example Tracking Entries</DialogTitle>
          <DialogDescription>
            Learn from real-world examples of effective student tracking.
          </DialogDescription>
        </DialogHeader>
        <ExampleEntries />
      </DialogContent>
    </Dialog>
  );
};

export default ExampleEntriesDialog;
