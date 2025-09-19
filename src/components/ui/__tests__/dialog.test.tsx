import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../dialog';

describe('DialogContent accessibility fallbacks', () => {
  it('respects locally exported wrappers and avoids injecting duplicate primitives', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>Download a CSV of your selections.</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Export data');
    expect(dialog).toHaveAccessibleDescription('Download a CSV of your selections.');

    const srOnlyNodes = Array.from(document.querySelectorAll('.sr-only'));
    const fallbackTexts = srOnlyNodes.map((node) => node.textContent?.trim()).filter(Boolean);
    expect(fallbackTexts).not.toContain('Dialog');
    expect(fallbackTexts).not.toContain('Dialog content');
  });

  it('still injects fallbacks when no accessible title or description is provided', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <p>Plain body content</p>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Dialog');
    expect(dialog).toHaveAccessibleDescription('Dialog content');
  });
});
